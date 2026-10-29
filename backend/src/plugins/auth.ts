import type { FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { Role } from "@prisma/client";
import { env } from "../config.js";
import { ForbiddenError, UnauthorizedError } from "../lib/errors.js";

/**
 * JWT payload is intentionally minimal. Role is included so authorization checks
 * don't require a DB round-trip for simple guards; for anything that touches
 * ownership, route handlers still re-read the user/resource from Prisma.
 */
export interface AuthUser {
  sub: string;
  email: string;
  role: Role;
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: import("fastify").FastifyRequest) => Promise<void>;
    requireRole: (...roles: Role[]) => (req: import("fastify").FastifyRequest) => Promise<void>;
  }
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthUser;
    user: AuthUser;
  }
}

export async function registerAuth(app: FastifyInstance): Promise<void> {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: "7d" },
  });

  app.decorate("authenticate", async (req) => {
    try {
      await req.jwtVerify();
      req.authUser = req.user;
    } catch {
      throw new UnauthorizedError("Invalid or missing access token");
    }
  });

  app.decorate("requireRole", (...roles: Role[]) => async (req) => {
    if (!req.authUser) throw new UnauthorizedError();
    if (!roles.includes(req.authUser.role)) {
      throw new ForbiddenError(`Requires role: ${roles.join(" or ")}`);
    }
  });
}
