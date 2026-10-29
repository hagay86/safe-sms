import argon2 from "argon2";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ConflictError, ForbiddenError, UnauthorizedError } from "../lib/errors.js";

export interface RegisterInput {
  email: string;
  password: string;
  role?: Role;
  displayName?: string;
  phone?: string;
}

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ConflictError("An account with that email already exists");

  if (input.phone) {
    const phoneTaken = await prisma.user.findUnique({ where: { phone: input.phone } });
    if (phoneTaken) throw new ConflictError("That phone number is already registered");
  }

  const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
  // ADMIN accounts cannot be created through the public register endpoint. The
  // seed script and a future admin-only "create-admin" endpoint are the only paths.
  const role = input.role === Role.COMPANY ? Role.COMPANY : Role.CONSUMER;

  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      role,
      displayName: input.displayName ?? null,
      phone: input.phone ?? null,
    },
    select: { id: true, email: true, role: true, displayName: true, phone: true, createdAt: true },
  });
}

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Run verify even on missing user so timing doesn't leak which emails exist.
  const hash = user?.passwordHash ?? "$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0$IW6VRXVq4Z6XrG+Z+rG/0A";
  const ok = await argon2.verify(hash, password);
  if (!user || !ok) throw new UnauthorizedError("Invalid email or password");
  return user;
}

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, displayName: true, phone: true },
  });
  if (!user) throw new UnauthorizedError("Account no longer exists");
  return user;
}

export async function deleteUserAccount(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  if (user.role === Role.ADMIN) throw new ForbiddenError("Admin accounts cannot be self-deleted");

  const owned = await prisma.company.findMany({ where: { ownerId: userId }, select: { id: true } });
  const ownedIds = owned.map((c) => c.id);

  await prisma.$transaction([
    // Messages received by this user, or sent by companies this user owns.
    prisma.smsDelivery.deleteMany({
      where: { OR: [{ recipientId: userId }, { companyId: { in: ownedIds } }] },
    }),
    // Keep the audit trail, but detach it from the deleted person.
    prisma.auditLog.updateMany({ where: { actorId: userId }, data: { actorId: null } }),
    // Companies cascade to their sender IDs and templates.
    prisma.company.deleteMany({ where: { ownerId: userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
}
