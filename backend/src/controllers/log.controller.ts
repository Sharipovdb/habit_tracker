import type { FastifyRequest, FastifyReply } from "fastify";
import * as habitService from "../services/habit.service";
import * as logService from "../services/log.service";

export async function createLog(
  request: FastifyRequest<{
    Params: { id: string };
    Body: Record<string, unknown>;
  }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const habitId = request.params.id;

  // Verify habit belongs to user
  const habit = await habitService.getHabitById(habitId, userId);
  if (!habit) {
    return reply.status(404).send({ error: "Habit not found" });
  }

  // Use provided date or today's date
  const date = (typeof request.body.date === "string" && request.body.date) || new Date().toISOString().split("T")[0];

  // Compute data based on habit type
  const data = logService.computeLogData(habit.type, request.body);

  const result = await logService.createLog(habitId, date, data);

  return reply.status(201).send(result.log);
}

export async function getLogs(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const habitId = request.params.id;

  const habit = await habitService.getHabitById(habitId, userId);
  if (!habit) {
    return reply.status(404).send({ error: "Habit not found" });
  }

  const logs = await logService.getLogsByHabit(habitId);
  return reply.send(logs);
}

export async function getStats(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const habitId = request.params.id;

  const habit = await habitService.getHabitById(habitId, userId);
  if (!habit) {
    return reply.status(404).send({ error: "Habit not found" });
  }

  const stats = await logService.getHabitStats(habitId, habit.type);
  return reply.send(stats);
}
