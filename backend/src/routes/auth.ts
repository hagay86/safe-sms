import type { FastifyInstance } from "fastify";
import { Role } from "@prisma/client";
import { z } from "zod";
import { parseBody } from "../lib/validate.js";
import { deleteUserAccount, getUserProfile, registerUser, verifyCredentials } from "../services/userService.js";

const phoneRegex = /^\+?[0-9\-\s()]{7,20}$/;

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum([Role.CONSUMER, Role.COMPANY]).optional(),
  displayName: z.string().min(1).max(100).optional(),
  phone: z.string().regex(phoneRegex).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export default async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (req, reply) => {
    const input = parseBody(RegisterSchema, req);
    const user = await registerUser(input);
    const token = await reply.jwtSign({ sub: user.id, email: user.email, role: user.role });
    return reply.status(201).send({ user, token });
  });

  app.post("/auth/login", async (req, reply) => {
    const { email, password } = parseBody(LoginSchema, req);
    const user = await verifyCredentials(email, password);
    const token = await reply.jwtSign({ sub: user.id, email: user.email, role: user.role });
    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        phone: user.phone,
      },
      token,
    });
  });

  app.get("/auth/me", { preHandler: [app.authenticate] }, async (req) => {
    return getUserProfile(req.authUser!.sub);
  });

  // Permanently delete the signed-in user's account and everything they own.
  // Required by App Store guideline 5.1.1(v) for apps that support sign-up.
  app.delete("/auth/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    await deleteUserAccount(req.authUser!.sub);
    return reply.status(204).send();
  });
}
