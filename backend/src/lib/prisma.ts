import { PrismaClient } from "@prisma/client";
import { env } from "../config.js";

// A single shared Prisma client for the process. Fastify lifecycle handlers close it on shutdown.
export const prisma = new PrismaClient({
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
