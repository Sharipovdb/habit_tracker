import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import corsPlugin from "./plugins/cors.js";
import authPlugin from "./plugins/auth.js";
import habitRoutes from "./routes/habit.routes.js";
import logRoutes from "./routes/log.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import foodRoutes from "./routes/food.routes.js";
import { authNodeHandler, syncLegacyCredentialAccounts } from "./auth.js";
import { isAllowedOrigin } from "./utils/origins.js";

function hasMissingRelationError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  if ("code" in error && error.code === "42P01") {
    return true;
  }

  if ("cause" in error) {
    return hasMissingRelationError(error.cause);
  }

  return false;
}

function applyAuthCorsHeaders(request: { headers: Record<string, unknown> }, rawReply: NodeJS.WritableStream & { setHeader: (name: string, value: string) => void }) {
  const originHeader = request.headers.origin;

  if (typeof originHeader !== "string") {
    return;
  }

  if (!isAllowedOrigin(originHeader)) {
    return;
  }

  rawReply.setHeader("Access-Control-Allow-Origin", originHeader);
  rawReply.setHeader("Access-Control-Allow-Credentials", "true");
  rawReply.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  rawReply.setHeader("Vary", "Origin");

  const requestedHeaders = request.headers["access-control-request-headers"];

  rawReply.setHeader(
    "Access-Control-Allow-Headers",
    typeof requestedHeaders === "string" && requestedHeaders.length > 0
      ? requestedHeaders
      : "content-type"
  );
}

function attachParsedBodyToRawRequest(request: { method: string; body?: unknown; raw: object }) {
  if (request.method === "GET" || request.method === "HEAD") {
    return;
  }

  if (request.body !== undefined) {
    (request.raw as { body?: unknown }).body = request.body;
  }
}

export function buildApp() {
  const fastify = Fastify({
    ajv: {
      customOptions: {
        allErrors: true,
      },
    },
    logger: true,
  });

  // Plugins
  fastify.register(corsPlugin);
  fastify.register(authPlugin);
  fastify.register(swagger, {
    openapi: {
      info: {
        title: "HabitTracker API",
        description: "API для трекинга привычек, питания, логов и дашборда.",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: "better-auth.session_token",
          },
        },
      },
      tags: [
        { name: "Auth", description: "Аутентификация пользователей" },
        { name: "Habits", description: "Управление привычками" },
        { name: "Food", description: "Поиск продуктов и питания" },
      ],
    },
  });
  fastify.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
    staticCSP: true,
    transformSpecificationClone: true,
  });

  fastify.addHook("onReady", async () => {
    try {
      await syncLegacyCredentialAccounts();
    } catch (error) {
      if (hasMissingRelationError(error)) {
        fastify.log.warn(
          "Skipping legacy credential sync because Better-Auth tables are missing. Apply the SQL migration before starting the API."
        );
        return;
      }

      fastify.log.warn({ error }, "Failed to sync legacy credential accounts");
    }
  });

  // Routes
  fastify.get("/", async () => ({
    status: "ok",
    message: "HabitTracker API is running",
    endpoints: ["/test", "/docs", "/api/auth", "/api/profile", "/api/dashboard", "/api/habits", "/api/food"],
  }));
  fastify.get("/test", async () => ({ status: "ok", timestamp: new Date().toISOString() }));
  fastify.route({
    method: ["GET", "POST", "OPTIONS"],
    url: "/api/auth/*",
    async handler(request, reply) {
      applyAuthCorsHeaders(request, reply.raw);
      attachParsedBodyToRawRequest(request);

      if (request.method === "OPTIONS") {
        return reply.status(204).send();
      }

      reply.hijack();
      await authNodeHandler(request.raw, reply.raw);
    },
  });
  fastify.register(profileRoutes, { prefix: "/api/profile" });
  fastify.register(dashboardRoutes, { prefix: "/api/dashboard" });
  fastify.register(habitRoutes, { prefix: "/api/habits" });
  fastify.register(logRoutes, { prefix: "/api/habits" });
  fastify.register(foodRoutes, { prefix: "/api/food" });

  return fastify;
}
