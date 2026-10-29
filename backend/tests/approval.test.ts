import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import argon2 from "argon2";
import { Role } from "@prisma/client";
import { closeTestApp, createTestApp, resetDatabase } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

/**
 * Tests the full approval chain:
 *   company registers → admin approves company → sender ID approved →
 *   template approved → SMS sends → consumer sees it in inbox as verified.
 *
 * Also exercises the negative paths: each approval gate blocks a send attempt.
 */
describe("approval pipeline", () => {
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

  async function seedUsers() {
    const hash = await argon2.hash("password123", { type: argon2.argon2id });
    const admin = await prisma.user.create({
      data: { email: "admin@t.io", passwordHash: hash, role: Role.ADMIN },
    });
    const consumer = await prisma.user.create({
      data: {
        email: "alice@t.io",
        passwordHash: hash,
        role: Role.CONSUMER,
        phone: "+15550000001",
      },
    });
    return { admin, consumer };
  }

  async function tokenFor(email: string, password = "password123"): Promise<string> {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password },
    });
    expect(res.statusCode, `login for ${email} failed: ${res.body}`).toBe(200);
    return res.json().token;
  }

  it("blocks send when company is pending, then succeeds once fully approved", async () => {
    const { admin, consumer } = await seedUsers();

    // 1. Company registers + logs in
    const reg = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "biz@t.io", password: "password123", role: "COMPANY" },
    });
    expect(reg.statusCode).toBe(201);
    const companyToken = reg.json().token;

    // 2. Create a company, sender, and template — all start pending
    const createCo = await app.inject({
      method: "POST",
      url: "/companies",
      headers: { authorization: `Bearer ${companyToken}` },
      payload: { name: "Test Bank" },
    });
    expect(createCo.statusCode).toBe(201);
    const companyId = createCo.json().id;

    const createSender = await app.inject({
      method: "POST",
      url: `/companies/${companyId}/sender-ids`,
      headers: { authorization: `Bearer ${companyToken}` },
      payload: { value: "TESTBANK" },
    });
    expect(createSender.statusCode).toBe(201);
    const senderIdId = createSender.json().id;

    const createTpl = await app.inject({
      method: "POST",
      url: `/companies/${companyId}/templates`,
      headers: { authorization: `Bearer ${companyToken}` },
      payload: { senderIdId, body: "Hi {{name}}, your code is {{code}}." },
    });
    expect(createTpl.statusCode).toBe(201);
    const templateId = createTpl.json().id;

    // 3. Attempt to send before any approval → 403
    const earlySend = await app.inject({
      method: "POST",
      url: "/messages/send",
      headers: { authorization: `Bearer ${companyToken}` },
      payload: {
        companyId,
        senderIdId,
        templateId,
        recipientPhone: consumer.phone,
        variables: { name: "Alice", code: "123456" },
      },
    });
    expect(earlySend.statusCode).toBe(403);
    expect(earlySend.json().error.message).toMatch(/company/i);

    // 4. Admin approves company — still blocked on sender
    const adminToken = await tokenFor(admin.email);
    let decide = await app.inject({
      method: "POST",
      url: `/admin/companies/${companyId}/decision`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { decision: "APPROVE" },
    });
    expect(decide.statusCode).toBe(200);

    const blockedAtSender = await app.inject({
      method: "POST",
      url: "/messages/send",
      headers: { authorization: `Bearer ${companyToken}` },
      payload: {
        companyId,
        senderIdId,
        templateId,
        recipientPhone: consumer.phone,
        variables: { name: "Alice", code: "123456" },
      },
    });
    expect(blockedAtSender.statusCode).toBe(403);
    expect(blockedAtSender.json().error.message).toMatch(/sender id/i);

    // 5. Approve sender → still blocked on template
    decide = await app.inject({
      method: "POST",
      url: `/admin/sender-ids/${senderIdId}/decision`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { decision: "APPROVE" },
    });
    expect(decide.statusCode).toBe(200);

    const blockedAtTpl = await app.inject({
      method: "POST",
      url: "/messages/send",
      headers: { authorization: `Bearer ${companyToken}` },
      payload: {
        companyId,
        senderIdId,
        templateId,
        recipientPhone: consumer.phone,
        variables: { name: "Alice", code: "123456" },
      },
    });
    expect(blockedAtTpl.statusCode).toBe(403);
    expect(blockedAtTpl.json().error.message).toMatch(/template/i);

    // 6. Approve template → send works
    decide = await app.inject({
      method: "POST",
      url: `/admin/templates/${templateId}/decision`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { decision: "APPROVE" },
    });
    expect(decide.statusCode).toBe(200);

    const finalSend = await app.inject({
      method: "POST",
      url: "/messages/send",
      headers: { authorization: `Bearer ${companyToken}` },
      payload: {
        companyId,
        senderIdId,
        templateId,
        recipientPhone: consumer.phone,
        variables: { name: "Alice", code: "123456" },
      },
    });
    expect(finalSend.statusCode).toBe(201);
    expect(finalSend.json().status).toBe("DELIVERED");
    expect(finalSend.json().body).toBe("Hi Alice, your code is 123456.");

    // 7. Consumer sees the verified SMS in their inbox
    const consumerToken = await tokenFor(consumer.email);
    const inbox = await app.inject({
      method: "GET",
      url: "/inbox",
      headers: { authorization: `Bearer ${consumerToken}` },
    });
    expect(inbox.statusCode).toBe(200);
    const rows = inbox.json();
    expect(rows).toHaveLength(1);
    expect(rows[0].verified).toBe(true);
    expect(rows[0].companyName).toBe("Test Bank");
    expect(rows[0].claimedSender).toBe("TESTBANK");
  });

  it("rejects send when the template has unresolved placeholders", async () => {
    const { admin, consumer } = await seedUsers();

    const reg = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "biz2@t.io", password: "password123", role: "COMPANY" },
    });
    const companyToken = reg.json().token;

    const co = await app.inject({
      method: "POST",
      url: "/companies",
      headers: { authorization: `Bearer ${companyToken}` },
      payload: { name: "Bank 2" },
    });
    const companyId = co.json().id;

    const sender = await app.inject({
      method: "POST",
      url: `/companies/${companyId}/sender-ids`,
      headers: { authorization: `Bearer ${companyToken}` },
      payload: { value: "BANK2" },
    });
    const senderIdId = sender.json().id;

    const tpl = await app.inject({
      method: "POST",
      url: `/companies/${companyId}/templates`,
      headers: { authorization: `Bearer ${companyToken}` },
      payload: { senderIdId, body: "Hi {{name}}, your OTP is {{code}}." },
    });
    const templateId = tpl.json().id;

    const adminToken = await tokenFor(admin.email);
    for (const path of [
      `/admin/companies/${companyId}/decision`,
      `/admin/sender-ids/${senderIdId}/decision`,
      `/admin/templates/${templateId}/decision`,
    ]) {
      await app.inject({
        method: "POST",
        url: path,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { decision: "APPROVE" },
      });
    }

    const missing = await app.inject({
      method: "POST",
      url: "/messages/send",
      headers: { authorization: `Bearer ${companyToken}` },
      payload: {
        companyId,
        senderIdId,
        templateId,
        recipientPhone: consumer.phone,
        variables: { name: "Alice" }, // code missing on purpose
      },
    });
    expect(missing.statusCode).toBe(400);
    expect(missing.json().error.message).toMatch(/code/);

    // An approved template must not become a free-form channel: a link smuggled
    // in through a variable is refused and nothing is delivered.
    const smuggled = await app.inject({
      method: "POST",
      url: "/messages/send",
      headers: { authorization: `Bearer ${companyToken}` },
      payload: {
        companyId,
        senderIdId,
        templateId,
        recipientPhone: consumer.phone,
        variables: { name: "Alice", code: "expired, verify at http://evil.example" },
      },
    });
    expect(smuggled.statusCode).toBe(400);
    expect(smuggled.json().error.message).toMatch(/code \(contains a link/);
    expect(await prisma.smsDelivery.count()).toBe(0);
  });

  it("refuses the reserved placeholder company name", async () => {
    const reg = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "sneaky@t.io", password: "password123", role: "COMPANY" },
    });
    const res = await app.inject({
      method: "POST",
      url: "/companies",
      headers: { authorization: `Bearer ${reg.json().token}` },
      payload: { name: "__unknown__" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects a duplicate sender ID across companies", async () => {
    await seedUsers();

    const a = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "a@t.io", password: "password123", role: "COMPANY" },
    });
    const b = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "b@t.io", password: "password123", role: "COMPANY" },
    });
    const tokenA = a.json().token;
    const tokenB = b.json().token;

    const coA = await app.inject({
      method: "POST",
      url: "/companies",
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { name: "Real Bank" },
    });
    const coB = await app.inject({
      method: "POST",
      url: "/companies",
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { name: "Impostor" },
    });

    const first = await app.inject({
      method: "POST",
      url: `/companies/${coA.json().id}/sender-ids`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { value: "REALBANK" },
    });
    expect(first.statusCode).toBe(201);

    const clash = await app.inject({
      method: "POST",
      url: `/companies/${coB.json().id}/sender-ids`,
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { value: "REALBANK" },
    });
    expect(clash.statusCode).toBe(409);
  });

  it("enforces role boundaries", async () => {
    const { consumer } = await seedUsers();

    const consumerToken = await tokenFor(consumer.email);

    // CONSUMER cannot list pending approvals
    const admin = await app.inject({
      method: "GET",
      url: "/admin/pending",
      headers: { authorization: `Bearer ${consumerToken}` },
    });
    expect(admin.statusCode).toBe(403);

    // CONSUMER cannot register companies
    const noCo = await app.inject({
      method: "POST",
      url: "/companies",
      headers: { authorization: `Bearer ${consumerToken}` },
      payload: { name: "Nope" },
    });
    expect(noCo.statusCode).toBe(403);
  });
});
