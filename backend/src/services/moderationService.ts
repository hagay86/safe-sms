import { ApprovalStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { NotFoundError } from "../lib/errors.js";
import { recordAudit } from "../lib/audit.js";

type Decision = "APPROVE" | "REJECT";

function decisionToStatus(decision: Decision): ApprovalStatus {
  return decision === "APPROVE" ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
}

export async function listPending() {
  const [companies, senderIds, templates] = await Promise.all([
    prisma.company.findMany({ where: { status: ApprovalStatus.PENDING }, orderBy: { createdAt: "asc" } }),
    prisma.senderId.findMany({
      where: { status: ApprovalStatus.PENDING },
      orderBy: { createdAt: "asc" },
      include: { company: { select: { id: true, name: true, status: true } } },
    }),
    prisma.messageTemplate.findMany({
      where: { status: ApprovalStatus.PENDING },
      orderBy: { createdAt: "asc" },
      include: {
        company: { select: { id: true, name: true, status: true } },
        senderId: { select: { id: true, value: true, status: true } },
      },
    }),
  ]);
  return { companies, senderIds, templates };
}

export async function decideCompany(id: string, reviewerId: string, decision: Decision, note?: string) {
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) throw new NotFoundError("Company not found");

  const updated = await prisma.company.update({
    where: { id },
    data: {
      status: decisionToStatus(decision),
      reviewerId,
      reviewNote: note ?? null,
      reviewedAt: new Date(),
    },
  });
  await recordAudit({
    actorId: reviewerId,
    action: `COMPANY_${decision}`,
    targetType: "Company",
    targetId: id,
    metadata: { note },
  });
  return updated;
}

export async function decideSenderId(id: string, reviewerId: string, decision: Decision, note?: string) {
  const sender = await prisma.senderId.findUnique({ where: { id }, include: { company: true } });
  if (!sender) throw new NotFoundError("Sender ID not found");

  const updated = await prisma.senderId.update({
    where: { id },
    data: {
      status: decisionToStatus(decision),
      reviewerId,
      reviewNote: note ?? null,
      reviewedAt: new Date(),
    },
  });
  await recordAudit({
    actorId: reviewerId,
    action: `SENDER_${decision}`,
    targetType: "SenderId",
    targetId: id,
    metadata: { note, value: sender.value, companyId: sender.companyId },
  });
  return updated;
}

export async function decideTemplate(id: string, reviewerId: string, decision: Decision, note?: string) {
  const template = await prisma.messageTemplate.findUnique({ where: { id } });
  if (!template) throw new NotFoundError("Template not found");

  const updated = await prisma.messageTemplate.update({
    where: { id },
    data: {
      status: decisionToStatus(decision),
      reviewerId,
      reviewNote: note ?? null,
      reviewedAt: new Date(),
    },
  });
  await recordAudit({
    actorId: reviewerId,
    action: `TEMPLATE_${decision}`,
    targetType: "MessageTemplate",
    targetId: id,
    metadata: { note, companyId: template.companyId, senderIdId: template.senderIdId },
  });
  return updated;
}
