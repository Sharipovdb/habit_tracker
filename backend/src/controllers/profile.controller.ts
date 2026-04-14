import type { FastifyRequest, FastifyReply } from "fastify";
import type { UpdateProfileInput } from "@shared";
import * as profileService from "../services/profile.service";
import { toUserDto } from "../utils/api-contracts";

export async function getProfile(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user.id;
  const profile = await profileService.getProfile(userId);
  if (!profile) {
    return reply.status(404).send({ error: "User not found" });
  }
  return reply.send(toUserDto(profile));
}

export async function updateProfile(
  request: FastifyRequest<{
    Body: UpdateProfileInput;
  }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const updated = await profileService.updateProfile(userId, request.body);
  if (!updated) {
    return reply.status(404).send({ error: "User not found" });
  }
  return reply.send(toUserDto(updated));
}
