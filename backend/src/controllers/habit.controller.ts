import type { FastifyRequest, FastifyReply } from "fastify";
import type { CreateHabitInput } from "@shared";
import * as habitService from "../services/habit.service.js";
import { toHabitDto } from "../utils/api-contracts.js";

export async function createHabit(
  request: FastifyRequest<{
    Body: CreateHabitInput;
  }>,
  reply: FastifyReply,
) {
  const { title, type, target } = request.body;
  const userId = request.authSession.user.id;
  const habit = await habitService.createHabit(userId, title, type, target);
  return reply.status(201).send(toHabitDto(habit));
}

export async function getHabits(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.authSession.user.id;
  const habits = await habitService.getHabitsByUser(userId);
  return reply.send(habits.map(toHabitDto));
}

export async function deleteHabit(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const userId = request.authSession.user.id;
  const deleted = await habitService.deleteHabit(request.params.id, userId);
  if (!deleted) {
    return reply.status(404).send({ error: "Habit not found" });
  }
  return reply.send({ message: "Habit deleted" });
}
