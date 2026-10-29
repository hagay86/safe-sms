import type { FastifyRequest } from "fastify";
import { z, type ZodTypeAny } from "zod";
import { BadRequestError } from "./errors.js";

/**
 * Parse a request section (body / params / query) with a Zod schema, throwing a
 * BadRequestError with structured details on failure. Keeps route handlers clean
 * and ensures all validation surfaces via the same error shape.
 */
export function parseWith<T extends ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new BadRequestError("Validation failed", {
      issues: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  return result.data;
}

export const parseBody = <T extends ZodTypeAny>(schema: T, req: FastifyRequest) => parseWith(schema, req.body);
export const parseParams = <T extends ZodTypeAny>(schema: T, req: FastifyRequest) => parseWith(schema, req.params);
export const parseQuery = <T extends ZodTypeAny>(schema: T, req: FastifyRequest) => parseWith(schema, req.query);
