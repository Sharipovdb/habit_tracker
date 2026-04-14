import type { FastifyInstance } from "fastify";
import { searchFood } from "../controllers/food.controller";
import { foodSearchSchema } from "../schemas/food.schema";

export default async function foodRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", fastify.authenticate);

  fastify.get("/search", { schema: foodSearchSchema }, searchFood);
}