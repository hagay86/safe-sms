import type { FastifyInstance } from "fastify";
import { Role } from "@prisma/client";
import { z } from "zod";
import { parseBody, parseParams } from "../lib/validate.js";
import {
  createCompany,
  createMessageTemplate,
  createSenderId,
  listCompaniesForOwner,
  listSenderIdsForCompany,
  listTemplatesForCompany,
} from "../services/companyService.js";

const CreateCompanySchema = z.object({
  name: z.string().min(2).max(120),
  legalName: z.string().max(200).optional(),
  website: z.string().url().max(300).optional(),
  description: z.string().max(1000).optional(),
});

const CompanyParamsSchema = z.object({ companyId: z.string().min(1) });

const CreateSenderSchema = z.object({
  value: z
    .string()
    .min(2)
    .max(32)
    // Brand names / short codes: letters, numbers, spaces, dashes, underscores.
    .regex(/^[A-Za-z0-9 _-]+$/, "Sender ID may only contain letters, numbers, spaces, dashes, or underscores"),
});

const CreateTemplateSchema = z.object({
  senderIdId: z.string().min(1),
  body: z.string().min(1).max(480),
});

export default async function companyRoutes(app: FastifyInstance) {
  // All routes in this file require an authenticated COMPANY user.
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireRole(Role.COMPANY));

  app.get("/companies", async (req) => {
    return listCompaniesForOwner(req.authUser!.sub);
  });

  app.post("/companies", async (req, reply) => {
    const input = parseBody(CreateCompanySchema, req);
    const company = await createCompany({ ...input, ownerId: req.authUser!.sub });
    return reply.status(201).send(company);
  });

  app.get("/companies/:companyId/sender-ids", async (req) => {
    const { companyId } = parseParams(CompanyParamsSchema, req);
    return listSenderIdsForCompany(companyId, req.authUser!.sub);
  });

  app.post("/companies/:companyId/sender-ids", async (req, reply) => {
    const { companyId } = parseParams(CompanyParamsSchema, req);
    const { value } = parseBody(CreateSenderSchema, req);
    const created = await createSenderId({ companyId, ownerId: req.authUser!.sub, value });
    return reply.status(201).send(created);
  });

  app.get("/companies/:companyId/templates", async (req) => {
    const { companyId } = parseParams(CompanyParamsSchema, req);
    return listTemplatesForCompany(companyId, req.authUser!.sub);
  });

  app.post("/companies/:companyId/templates", async (req, reply) => {
    const { companyId } = parseParams(CompanyParamsSchema, req);
    const { senderIdId, body } = parseBody(CreateTemplateSchema, req);
    const created = await createMessageTemplate({
      companyId,
      ownerId: req.authUser!.sub,
      senderIdId,
      body,
    });
    return reply.status(201).send(created);
  });
}
