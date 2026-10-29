import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { closeTestApp, createTestApp, resetDatabase } from "./helpers.js";

describe("auth", () => {
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

  it("registers a consumer and returns a token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "c@x.com", password: "password123" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user.role).toBe("CONSUMER");
    expect(body.token).toBeTypeOf("string");
  });

  it("rejects a duplicate email", async () => {
    const payload = { email: "d@x.com", password: "password123" };
    const first = await app.inject({ method: "POST", url: "/auth/register", payload });
    expect(first.statusCode).toBe(201);
    const second = await app.inject({ method: "POST", url: "/auth/register", payload });
    expect(second.statusCode).toBe(409);
    expect(second.json().error.code).toBe("CONFLICT");
  });

  it("refuses to let the public register an ADMIN", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      // TypeScript can't tell this is a hostile role — the service layer is what
      // actually enforces the downgrade to CONSUMER, so we verify that here.
      payload: { email: "e@x.com", password: "password123", role: "ADMIN" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().user.role).toBe("CONSUMER");
  });

  it("logs in with correct credentials and fails with wrong ones", async () => {
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "f@x.com", password: "password123" },
    });
    const ok = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "f@x.com", password: "password123" },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().token).toBeTypeOf("string");

    const bad = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "f@x.com", password: "wrongpassword" },
    });
    expect(bad.statusCode).toBe(401);
  });

  it("returns 401 on /auth/me without a token", async () => {
    const res = await app.inject({ method: "GET", url: "/auth/me" });
    expect(res.statusCode).toBe(401);
  });
});
