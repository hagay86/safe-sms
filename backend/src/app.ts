import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { env } from "./config.js";
import { registerAuth } from "./plugins/auth.js";
import { registerErrorHandler } from "./plugins/errorHandler.js";
import authRoutes from "./routes/auth.js";
import companyRoutes from "./routes/companies.js";
import adminRoutes from "./routes/admin.js";
import messageRoutes from "./routes/messages.js";

/**
 * Build a fully wired Fastify app. Exported separately from the server bootstrap
 * so integration tests can spin one up without binding a port.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      env.NODE_ENV === "test"
        ? false
        : {
            level: env.LOG_LEVEL,
            transport: env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
          },
    disableRequestLogging: env.NODE_ENV === "test",
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: true, credentials: true });
  await registerAuth(app);
  registerErrorHandler(app);

  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  await app.register(authRoutes);
  await app.register(companyRoutes);
  await app.register(adminRoutes);
  await app.register(messageRoutes);

  return app;
}
