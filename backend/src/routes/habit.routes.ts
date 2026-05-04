import type { FastifyInstance } from "fastify";
import {
  createHabit,
  getHabits,
  deleteHabit,
} from "../controllers/habit.controller.js";
import {
  createHabitSchema,
  deleteHabitSchema,
} from "../schemas/habit.schema.js";

export default async function habitRoutes(fastify: FastifyInstance) {
  // All habit routes require authentication
  fastify.addHook("onRequest", fastify.authenticate);

  fastify.post("/", { schema: createHabitSchema }, createHabit);
  fastify.get("/", getHabits);
  fastify.delete("/:id", { schema: deleteHabitSchema }, deleteHabit);
}
