import type { FastifyInstance } from "fastify";
import { dashboard } from "../controllers/dashboard.controller";

export default async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", fastify.authenticate);
  fastify.get("/", dashboard);
}
