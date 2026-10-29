import type { FastifyInstance } from "fastify";
import { AppError } from "../lib/errors.js";

/**
 * One response envelope for all errors. Anything that isn't an AppError is
 * mapped to a generic 500 so we don't leak internals.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({
        error: { code: err.code, message: err.message, details: err.details ?? undefined },
      });
    }
    // @fastify/jwt throws errors with a `code` string we can surface cleanly
    if ((err as { code?: string }).code?.startsWith?.("FST_JWT_")) {
      return reply.status(401).send({ error: { code: "UNAUTHORIZED", message: err.message } });
    }
    req.log.error({ err }, "Unhandled error");
    return reply.status(500).send({ error: { code: "INTERNAL", message: "Internal server error" } });
  });

  app.setNotFoundHandler((_req, reply) => {
    reply.status(404).send({ error: { code: "NOT_FOUND", message: "Route not found" } });
  });
}
