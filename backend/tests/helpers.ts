import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp();
  await app.ready();
  return app;
}

/** Wipe every table between test files so each file starts from a clean slate. */
export async function resetDatabase(): Promise<void> {
  // Order matters: children before parents
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.smsDelivery.deleteMany(),
    prisma.messageTemplate.deleteMany(),
    prisma.senderId.deleteMany(),
    prisma.company.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export async function closeTestApp(app: FastifyInstance): Promise<void> {
  await app.close();
  await prisma.$disconnect();
}
