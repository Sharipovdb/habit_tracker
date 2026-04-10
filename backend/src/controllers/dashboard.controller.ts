import type { FastifyRequest, FastifyReply } from "fastify";
import { getDashboardStats } from "../services/dashboard.service";

export async function dashboard(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user.id;
  const stats = await getDashboardStats(userId);
  return reply.send(stats);
}
