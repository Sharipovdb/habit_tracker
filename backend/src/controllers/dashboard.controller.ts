import type { FastifyRequest, FastifyReply } from "fastify";
import { getDashboardStats } from "../services/dashboard.service.js";
import { getRequestUserId } from "../utils/request-auth.js";

export async function dashboard(request: FastifyRequest, reply: FastifyReply) {
  const userId = getRequestUserId(request);
  const stats = await getDashboardStats(userId);
  return reply.send(stats);
}
