import type { FastifyInstance } from "fastify";
import { searchFood } from "../controllers/food.controller.js";
import { foodSearchSchema } from "../schemas/food.schema.js";

export default async function foodRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", fastify.authenticate);

  fastify.get("/search", { schema: foodSearchSchema }, searchFood);
}