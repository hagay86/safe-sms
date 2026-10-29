import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

/**
 * Record an audit event. We fire-and-forget from route handlers where failing to
 * log shouldn't break the user-visible request; elsewhere the caller awaits it.
 */
export async function recordAudit(params: {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Prisma.InputJsonObject;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId ?? null,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata ?? undefined,
    },
  });
}
