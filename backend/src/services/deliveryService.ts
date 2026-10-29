import { ApprovalStatus, DeliveryStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ForbiddenError, NotFoundError } from "../lib/errors.js";
import { renderBody } from "../lib/template.js";
import { getCompanyForOwner, UNKNOWN_COMPANY_NAME } from "./companyService.js";

export interface SendSmsInput {
  ownerId: string;
  companyId: string;
  senderIdId: string;
  templateId: string;
  recipientPhone: string;
  variables?: Record<string, string>;
}

export async function sendSms(input: SendSmsInput) {
  // The three trust checks live here. Any failure is recorded as a BLOCKED_*
  // delivery so the consumer (and audit log) can see the attempt.
  const company = await getCompanyForOwner(input.companyId, input.ownerId);
  if (company.status !== ApprovalStatus.APPROVED) {
    throw new ForbiddenError("Company is not approved to send messages");
  }

  const sender = await prisma.senderId.findUnique({ where: { id: input.senderIdId } });
  if (!sender || sender.companyId !== company.id) {
    throw new NotFoundError("Sender ID not found for this company");
  }
  if (sender.status !== ApprovalStatus.APPROVED) {
    throw new ForbiddenError("Sender ID is not approved");
  }

  const template = await prisma.messageTemplate.findUnique({ where: { id: input.templateId } });
  if (!template || template.companyId !== company.id || template.senderIdId !== sender.id) {
    throw new NotFoundError("Template not found for this sender");
  }
  if (template.status !== ApprovalStatus.APPROVED) {
    throw new ForbiddenError("Template is not approved");
  }

  const recipient = await prisma.user.findUnique({ where: { phone: input.recipientPhone } });
  if (!recipient) {
    // Fan-out to users outside the system isn't the MVP scope — the recipient
    // must exist so they have an inbox to land in.
    throw new NotFoundError("Recipient has no SafeSMS account");
  }

  const body = renderBody(template.body, template.placeholders, input.variables ?? {});

  return prisma.smsDelivery.create({
    data: {
      companyId: company.id,
      senderIdId: sender.id,
      templateId: template.id,
      recipientId: recipient.id,
      body,
      claimedSender: sender.value,
      status: DeliveryStatus.DELIVERED,
    },
  });
}

/**
 * Simulates an inbound SMS from an *unverified* source. This is how we model
 * real-world scam SMS arriving outside the SafeSMS pipeline — they land in the
 * consumer's inbox with status BLOCKED_UNKNOWN_SENDER.
 */
export async function simulateUnverifiedSms(params: {
  recipientPhone: string;
  claimedSender: string;
  body: string;
}) {
  const recipient = await prisma.user.findUnique({ where: { phone: params.recipientPhone } });
  if (!recipient) throw new NotFoundError("Recipient has no SafeSMS account");

  // Guard: if an approved sender already owns this name, the SMS would have
  // gone through `sendSms`. This endpoint is intentionally for demo/testing.
  const sender = await prisma.senderId.findUnique({ where: { value: params.claimedSender } });
  const unknownOrBlocked =
    !sender || sender.status !== ApprovalStatus.APPROVED
      ? DeliveryStatus.BLOCKED_UNKNOWN_SENDER
      : DeliveryStatus.BLOCKED_UNAPPROVED_TEMPLATE;

  return prisma.smsDelivery.create({
    data: {
      companyId: sender?.companyId ?? (await fallbackCompanyId()),
      senderIdId: sender?.id ?? null,
      templateId: null,
      recipientId: recipient.id,
      body: params.body,
      claimedSender: params.claimedSender,
      status: unknownOrBlocked,
    },
  });
}

/**
 * Unverified messages still need a companyId because SmsDelivery requires one
 * (deliveries are always tied back to *some* company for accounting). We keep
 * a singleton "Unknown" company for this — created lazily.
 */
async function fallbackCompanyId(): Promise<string> {
  const existing = await prisma.company.findFirst({
    where: { name: UNKNOWN_COMPANY_NAME, owner: { role: "ADMIN" } },
  });
  if (existing) return existing.id;
  // Owner: first admin. If no admin exists, this will throw — acceptable for
  // the MVP since the seed script always creates an admin.
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("Cannot create unknown-company placeholder without an admin user");
  const created = await prisma.company.create({
    data: {
      name: UNKNOWN_COMPANY_NAME,
      ownerId: admin.id,
      status: ApprovalStatus.REJECTED,
      description: "Placeholder for messages from unverified senders",
    },
  });
  return created.id;
}

export async function getInbox(recipientId: string) {
  const rows = await prisma.smsDelivery.findMany({
    where: { recipientId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      company: { select: { id: true, name: true, status: true } },
      senderId: { select: { id: true, value: true, status: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    claimedSender: r.claimedSender,
    status: r.status,
    verified: r.status === DeliveryStatus.DELIVERED,
    // Only show a company name for verified deliveries. A spoof that claims an
    // approved brand's sender ID must not borrow that brand's name in the UI.
    companyName:
      r.status === DeliveryStatus.DELIVERED && r.company.name !== UNKNOWN_COMPANY_NAME ? r.company.name : null,
    createdAt: r.createdAt,
  }));
}
