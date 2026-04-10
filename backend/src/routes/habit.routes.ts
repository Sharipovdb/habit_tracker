import type { FastifyInstance } from "fastify";
import {
  createHabit,
  getHabits,
  getHabit,
  deleteHabit,
} from "../controllers/habit.controller";
import {
  createHabitSchema,
  habitParamsSchema,
} from "../schemas/habit.schema";

export default async function habitRoutes(fastify: FastifyInstance) {
  // All habit routes require authentication
  fastify.addHook("onRequest", fastify.authenticate);

  fastify.post("/", { schema: createHabitSchema }, createHabit);
  fastify.get("/", getHabits);
  fastify.get("/:id", { schema: habitParamsSchema }, getHabit);
  fastify.delete("/:id", { schema: habitParamsSchema }, deleteHabit);
}
