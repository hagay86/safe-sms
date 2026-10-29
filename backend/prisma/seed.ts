/**
 * Seed the database with a demo dataset that exercises the full approval flow:
 *
 *   admin@safesms.io (ADMIN)
 *   acme@safesms.io  (COMPANY) → "Acme Bank" approved, "ACMEBANK" sender approved,
 *                                 two approved templates
 *   scammer@safesms.io (COMPANY) → "Fake Bank" pending, sender pending
 *   alice@safesms.io / bob@safesms.io (CONSUMERS) with phones, inbox seeded with
 *                                                    one verified + one blocked SMS
 *
 * Password for every seeded account: `password123`.
 */
import argon2 from "argon2";
import { ApprovalStatus, DeliveryStatus, PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // In production set SEED_PASSWORD / ADMIN_PASSWORD so demo accounts don't use a public default.
  const demoPassword = process.env.SEED_PASSWORD || "password123";
  const passwordHash = await argon2.hash(demoPassword, { type: argon2.argon2id });
  const adminHash = process.env.ADMIN_PASSWORD
    ? await argon2.hash(process.env.ADMIN_PASSWORD, { type: argon2.argon2id })
    : passwordHash;

  const admin = await prisma.user.upsert({
    where: { email: "admin@safesms.io" },
    update: {},
    create: {
      email: "admin@safesms.io",
      passwordHash: adminHash,
      role: Role.ADMIN,
      displayName: "SafeSMS Admin",
    },
  });

  const acmeOwner = await prisma.user.upsert({
    where: { email: "acme@safesms.io" },
    update: {},
    create: {
      email: "acme@safesms.io",
      passwordHash,
      role: Role.COMPANY,
      displayName: "Acme Bank Ops",
    },
  });

  const scammer = await prisma.user.upsert({
    where: { email: "scammer@safesms.io" },
    update: {},
    create: {
      email: "scammer@safesms.io",
      passwordHash,
      role: Role.COMPANY,
      displayName: "Totally Real Bank",
    },
  });

  const alice = await prisma.user.upsert({
    where: { email: "alice@safesms.io" },
    update: {},
    create: {
      email: "alice@safesms.io",
      passwordHash,
      role: Role.CONSUMER,
      displayName: "Alice",
      phone: "+15551110001",
    },
  });

  await prisma.user.upsert({
    where: { email: "bob@safesms.io" },
    update: {},
    create: {
      email: "bob@safesms.io",
      passwordHash,
      role: Role.CONSUMER,
      displayName: "Bob",
      phone: "+15551110002",
    },
  });

  // Idempotent: the demo companies/messages are only created once, so this can
  // safely run on every deploy.
  if (await prisma.company.findFirst({ where: { name: "Acme Bank" } })) {
    console.log("✓ Seed already applied — skipping demo data");
    return;
  }

  // Acme Bank → approved, with approved sender + approved template
  const acme = await prisma.company.create({
    data: {
      name: "Acme Bank",
      legalName: "Acme Banking Corp",
      website: "https://acme.example.com",
      description: "A bank you can almost trust.",
      ownerId: acmeOwner.id,
      status: ApprovalStatus.APPROVED,
      reviewerId: admin.id,
      reviewedAt: new Date(),
      reviewNote: "Verified KYC docs, approved 2026-04-21",
    },
  });

  const acmeSender = await prisma.senderId.create({
    data: {
      companyId: acme.id,
      value: "ACMEBANK",
      status: ApprovalStatus.APPROVED,
      reviewerId: admin.id,
      reviewedAt: new Date(),
    },
  });

  const otpTemplate = await prisma.messageTemplate.create({
    data: {
      companyId: acme.id,
      senderIdId: acmeSender.id,
      body: "Hi {{name}}, your Acme Bank OTP is {{code}}. Do not share it with anyone.",
      placeholders: ["name", "code"],
      status: ApprovalStatus.APPROVED,
      reviewerId: admin.id,
      reviewedAt: new Date(),
    },
  });

  await prisma.messageTemplate.create({
    data: {
      companyId: acme.id,
      senderIdId: acmeSender.id,
      body: "Acme Bank alert: a login to your account was detected from {{location}}.",
      placeholders: ["location"],
      status: ApprovalStatus.APPROVED,
      reviewerId: admin.id,
      reviewedAt: new Date(),
    },
  });

  // Scammer company → pending
  const fake = await prisma.company.create({
    data: {
      name: "Fake Bank",
      ownerId: scammer.id,
      status: ApprovalStatus.PENDING,
      description: "Totally legit, please approve",
    },
  });
  await prisma.senderId.create({
    data: { companyId: fake.id, value: "FAKEBANK", status: ApprovalStatus.PENDING },
  });

  // Seed Alice's inbox: one verified delivery and one unverified spoof attempt
  await prisma.smsDelivery.create({
    data: {
      companyId: acme.id,
      senderIdId: acmeSender.id,
      templateId: otpTemplate.id,
      recipientId: alice.id,
      body: "Hi Alice, your Acme Bank OTP is 482913. Do not share it with anyone.",
      claimedSender: "ACMEBANK",
      status: DeliveryStatus.DELIVERED,
    },
  });

  // Unknown-company placeholder — idempotent: reuse if seeded before
  const unknownCo =
    (await prisma.company.findFirst({ where: { name: "__unknown__" } })) ??
    (await prisma.company.create({
      data: {
        name: "__unknown__",
        ownerId: admin.id,
        status: ApprovalStatus.REJECTED,
        description: "Placeholder for messages from unverified senders",
      },
    }));

  await prisma.smsDelivery.create({
    data: {
      companyId: unknownCo.id,
      recipientId: alice.id,
      body: "URGENT: Your Acme Bank account is locked. Tap http://ac-me.example/login to restore.",
      claimedSender: "Acme-Alerts",
      status: DeliveryStatus.BLOCKED_UNKNOWN_SENDER,
    },
  });

  console.log("✓ Seed complete");
  console.log("  admin:    admin@safesms.io / password123");
  console.log("  company:  acme@safesms.io / password123 (approved)");
  console.log("  company:  scammer@safesms.io / password123 (pending)");
  console.log("  consumer: alice@safesms.io / password123 (phone +15551110001)");
  console.log("  consumer: bob@safesms.io / password123 (phone +15551110002)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
