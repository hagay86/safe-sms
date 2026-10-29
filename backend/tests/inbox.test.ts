import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import argon2 from "argon2";
import { ApprovalStatus, Role } from "@prisma/client";
import { closeTestApp, createTestApp, resetDatabase } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

describe("consumer inbox", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await closeTestApp(app);
  });
  beforeEach(async () => {
    await resetDatabase();
  });

  it("lists verified and blocked messages with the correct flags", async () => {
    const hash = await argon2.hash("password123", { type: argon2.argon2id });

    const admin = await prisma.user.create({
      data: { email: "admin@t.io", passwordHash: hash, role: Role.ADMIN },
    });
    const owner = await prisma.user.create({
      data: { email: "co@t.io", passwordHash: hash, role: Role.COMPANY },
    });
    const alice = await prisma.user.create({
      data: {
        email: "alice@t.io",
        passwordHash: hash,
        role: Role.CONSUMER,
        phone: "+15550000010",
      },
    });

    const company = await prisma.company.create({
      data: { name: "My Bank", ownerId: owner.id, status: ApprovalStatus.APPROVED },
    });
    const sender = await prisma.senderId.create({
      data: { companyId: company.id, value: "MYBANK", status: ApprovalStatus.APPROVED },
    });
    const template = await prisma.messageTemplate.create({
      data: {
        companyId: company.id,
        senderIdId: sender.id,
        body: "Hi {{name}}",
        placeholders: ["name"],
        status: ApprovalStatus.APPROVED,
      },
    });

    // Simulate one verified delivery directly
    await prisma.smsDelivery.create({
      data: {
        companyId: company.id,
        senderIdId: sender.id,
        templateId: template.id,
        recipientId: alice.id,
        body: "Hi Alice",
        claimedSender: "MYBANK",
        status: "DELIVERED",
      },
    });

    // And one simulated unverified via the admin endpoint
    const adminLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: admin.email, password: "password123" },
    });
    const adminToken = adminLogin.json().token;

    const spoof = await app.inject({
      method: "POST",
      url: "/messages/simulate-unverified",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        recipientPhone: alice.phone,
        claimedSender: "MYBANK-FAKE",
        body: "You won a prize! Click here.",
      },
    });
    expect(spoof.statusCode).toBe(201);
    expect(spoof.json().status).toBe("BLOCKED_UNKNOWN_SENDER");

    // A spoof that reuses the approved sender ID verbatim (outside the pipeline)
    const lookalike = await app.inject({
      method: "POST",
      url: "/messages/simulate-unverified",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        recipientPhone: alice.phone,
        claimedSender: "MYBANK",
        body: "Your account is locked. Call us now.",
      },
    });
    expect(lookalike.statusCode).toBe(201);

    // Consumer reads inbox
    const aliceLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: alice.email, password: "password123" },
    });
    const token = aliceLogin.json().token;

    const inbox = await app.inject({
      method: "GET",
      url: "/inbox",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(inbox.statusCode).toBe(200);
    const rows = inbox.json();
    expect(rows).toHaveLength(3);

    type Row = { claimedSender: string; verified: boolean; companyName: string | null };
    const verified = rows.find((r: Row) => r.claimedSender === "MYBANK" && r.verified);
    const lookalikeRow = rows.find((r: Row) => r.claimedSender === "MYBANK" && !r.verified);
    // Must not borrow the real brand's name — that would make the scam look legit.
    expect(lookalikeRow.companyName).toBeNull();
    const blocked = rows.find((r: { claimedSender: string }) => r.claimedSender === "MYBANK-FAKE");
    expect(verified.verified).toBe(true);
    expect(verified.companyName).toBe("My Bank");
    expect(blocked.verified).toBe(false);
    expect(blocked.status).toBe("BLOCKED_UNKNOWN_SENDER");
    expect(blocked.companyName).toBeNull();
  });
});
