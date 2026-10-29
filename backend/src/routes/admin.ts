import type { FastifyInstance } from "fastify";
import { Role } from "@prisma/client";
import { z } from "zod";
import { parseBody, parseParams } from "../lib/validate.js";
import { decideCompany, decideSenderId, decideTemplate, listPending } from "../services/moderationService.js";

const DecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  note: z.string().max(500).optional(),
});

const IdParamsSchema = z.object({ id: z.string().min(1) });

export default async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireRole(Role.ADMIN));

  app.get("/admin/pending", async () => listPending());

  app.post("/admin/companies/:id/decision", async (req) => {
    const { id } = parseParams(IdParamsSchema, req);
    const { decision, note } = parseBody(DecisionSchema, req);
    return decideCompany(id, req.authUser!.sub, decision, note);
  });

  app.post("/admin/sender-ids/:id/decision", async (req) => {
    const { id } = parseParams(IdParamsSchema, req);
    const { decision, note } = parseBody(DecisionSchema, req);
    return decideSenderId(id, req.authUser!.sub, decision, note);
  });

  app.post("/admin/templates/:id/decision", async (req) => {
    const { id } = parseParams(IdParamsSchema, req);
    const { decision, note } = parseBody(DecisionSchema, req);
    return decideTemplate(id, req.authUser!.sub, decision, note);
  });
}
