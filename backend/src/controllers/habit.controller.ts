import type { FastifyRequest, FastifyReply } from "fastify";
import * as habitService from "../services/habit.service";

export async function createHabit(
  request: FastifyRequest<{
    Body: { title: string; type: string; target?: string };
  }>,
  reply: FastifyReply
) {
  const { title, type, target } = request.body;
  const userId = request.user.id;
  const habit = await habitService.createHabit(userId, title, type, target);
  return reply.status(201).send(habit);
}

export async function getHabits(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const habits = await habitService.getHabitsByUser(userId);
  return reply.send(habits);
}

export async function getHabit(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const habit = await habitService.getHabitById(request.params.id, userId);
  if (!habit) {
    return reply.status(404).send({ error: "Habit not found" });
  }
  return reply.send(habit);
}

export async function deleteHabit(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const deleted = await habitService.deleteHabit(request.params.id, userId);
  if (!deleted) {
    return reply.status(404).send({ error: "Habit not found" });
  }
  return reply.send({ message: "Habit deleted" });
}
