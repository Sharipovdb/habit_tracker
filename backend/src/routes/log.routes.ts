import type { FastifyInstance } from "fastify";
import { createLog, getLogs, getStats } from "../controllers/log.controller";

export default async function logRoutes(fastify: FastifyInstance) {
  // All log routes require authentication
  fastify.addHook("onRequest", fastify.authenticate);

  fastify.post("/:id/log", createLog);
  fastify.get("/:id/logs", getLogs);
  fastify.get("/:id/stats", getStats);
}
