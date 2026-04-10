import type { FastifyRequest, FastifyReply } from "fastify";
import * as profileService from "../services/profile.service";

export async function getProfile(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user.id;
  const profile = await profileService.getProfile(userId);
  if (!profile) {
    return reply.status(404).send({ error: "User not found" });
  }
  return reply.send(profile);
}

export async function updateProfile(
  request: FastifyRequest<{
    Body: { name?: string; age?: number; height?: number; weight?: number };
  }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const updated = await profileService.updateProfile(userId, request.body);
  if (!updated) {
    return reply.status(404).send({ error: "User not found" });
  }
  return reply.send(updated);
}
