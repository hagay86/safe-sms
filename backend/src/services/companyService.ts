import { ApprovalStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../lib/errors.js";
import { extractPlaceholders } from "../lib/template.js";

/** Internal placeholder company that owns deliveries from unverified senders. Reserved. */
export const UNKNOWN_COMPANY_NAME = "__unknown__";

export interface CreateCompanyInput {
  ownerId: string;
  name: string;
  legalName?: string;
  website?: string;
  description?: string;
}

export async function createCompany(input: CreateCompanyInput) {
  if (input.name.trim().toLowerCase() === UNKNOWN_COMPANY_NAME) {
    throw new BadRequestError("That company name is reserved");
  }
  return prisma.company.create({
    data: {
      name: input.name,
      legalName: input.legalName ?? null,
      website: input.website ?? null,
      description: input.description ?? null,
      ownerId: input.ownerId,
      status: ApprovalStatus.PENDING,
    },
  });
}

export async function getCompanyForOwner(companyId: string, ownerId: string) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new NotFoundError("Company not found");
  if (company.ownerId !== ownerId) throw new ForbiddenError("You don't own this company");
  return company;
}

export async function listCompaniesForOwner(ownerId: string) {
  return prisma.company.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { senderIds: true, templates: true } },
    },
  });
}

export interface CreateSenderIdInput {
  companyId: string;
  ownerId: string;
  value: string;
}

export async function createSenderId(input: CreateSenderIdInput) {
  await getCompanyForOwner(input.companyId, input.ownerId);
  try {
    return await prisma.senderId.create({
      data: {
        companyId: input.companyId,
        value: input.value,
        status: ApprovalStatus.PENDING,
      },
    });
  } catch (err) {
    // Sender IDs are globally unique so no two companies can claim the same brand.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError(`Sender ID "${input.value}" is already registered`);
    }
    throw err;
  }
}

export async function listSenderIdsForCompany(companyId: string, ownerId: string) {
  await getCompanyForOwner(companyId, ownerId);
  return prisma.senderId.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } });
}

export interface CreateTemplateInput {
  companyId: string;
  ownerId: string;
  senderIdId: string;
  body: string;
}

export async function createMessageTemplate(input: CreateTemplateInput) {
  const company = await getCompanyForOwner(input.companyId, input.ownerId);
  const sender = await prisma.senderId.findUnique({ where: { id: input.senderIdId } });
  if (!sender || sender.companyId !== company.id) {
    throw new NotFoundError("Sender ID not found for this company");
  }
  if (sender.status !== ApprovalStatus.APPROVED) {
    // Intentional: we still *accept* the template but block any delivery using
    // it until the sender is approved. Surface the constraint so the UI is honest.
    // (Templates can be reviewed in parallel with their sender.)
  }
  return prisma.messageTemplate.create({
    data: {
      companyId: company.id,
      senderIdId: sender.id,
      body: input.body,
      placeholders: extractPlaceholders(input.body),
      status: ApprovalStatus.PENDING,
    },
  });
}

export async function listTemplatesForCompany(companyId: string, ownerId: string) {
  await getCompanyForOwner(companyId, ownerId);
  return prisma.messageTemplate.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: { senderId: { select: { value: true, status: true } } },
  });
}
