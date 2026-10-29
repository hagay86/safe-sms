import type { FastifyInstance } from "fastify";
import { Role } from "@prisma/client";
import { z } from "zod";
import { parseBody } from "../lib/validate.js";
import { getInbox, sendSms, simulateUnverifiedSms } from "../services/deliveryService.js";

const SendSchema = z.object({
  companyId: z.string().min(1),
  senderIdId: z.string().min(1),
  templateId: z.string().min(1),
  recipientPhone: z.string().min(5).max(20),
  variables: z.record(z.string()).optional(),
});

const SimulateUnverifiedSchema = z.object({
  recipientPhone: z.string().min(5).max(20),
  claimedSender: z.string().min(1).max(40),
  body: z.string().min(1).max(480),
});

export default async function messageRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // Company sends an approved SMS to a recipient.
  app.post(
    "/messages/send",
    { preHandler: [app.requireRole(Role.COMPANY)] },
    async (req, reply) => {
      const input = parseBody(SendSchema, req);
      const delivery = await sendSms({ ...input, ownerId: req.authUser!.sub });
      return reply.status(201).send(delivery);
    },
  );

  // Demo-only endpoint for simulating an inbound spoof message. ADMIN only so
  // consumers can't spam their own inboxes with fake data.
  app.post(
    "/messages/simulate-unverified",
    { preHandler: [app.requireRole(Role.ADMIN)] },
    async (req, reply) => {
      const input = parseBody(SimulateUnverifiedSchema, req);
      const delivery = await simulateUnverifiedSms(input);
      return reply.status(201).send(delivery);
    },
  );

  // Consumer inbox.
  app.get("/inbox", { preHandler: [app.requireRole(Role.CONSUMER)] }, async (req) => {
    return getInbox(req.authUser!.sub);
  });
}
