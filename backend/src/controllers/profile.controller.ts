import { createReadStream } from "node:fs";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { UpdateProfileInput } from "@shared";
import * as profileService from "../services/profile.service.js";
import { toUserDto } from "../utils/api-contracts.js";
import {
  AvatarStorageError,
  MAX_AVATAR_FILE_SIZE,
  deleteLocalAvatar,
  getLocalAvatarFile,
  saveAvatarUpload,
} from "../utils/avatar-storage.js";

export async function getProfile(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.authSession.user.id;
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
  const userId = request.authSession.user.id;
  const updated = await profileService.updateProfile(userId, request.body);
  if (!updated) {
    return reply.status(404).send({ error: "User not found" });
  }
  return reply.send(toUserDto(updated));
}

export async function uploadAvatar(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.authSession.user.id;
  const profile = await profileService.getProfile(userId);

  if (!profile) {
    return reply.status(404).send({ error: "User not found" });
  }

  let file;

  try {
    file = await request.file({
      limits: {
        files: 1,
        fileSize: MAX_AVATAR_FILE_SIZE,
      },
    });
  } catch (error) {
    if (error instanceof request.server.multipartErrors.RequestFileTooLargeError) {
      return reply.status(413).send({ error: "Avatar file is too large" });
    }

    throw error;
  }

  if (!file) {
    return reply.status(400).send({ error: "Avatar file is required" });
  }

  let nextImageUrl: string | null = null;

  try {
    nextImageUrl = await saveAvatarUpload(request, userId, file);
    const updated = await profileService.setProfileImage(userId, nextImageUrl);

    if (!updated) {
      await deleteLocalAvatar(nextImageUrl);
      return reply.status(404).send({ error: "User not found" });
    }

    await deleteLocalAvatar(profile.image);
    return reply.send(toUserDto(updated));
  } catch (error) {
    if (nextImageUrl) {
      await deleteLocalAvatar(nextImageUrl);
    }

    if (error instanceof AvatarStorageError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }

    throw error;
  }
}

export async function deleteAvatar(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.authSession.user.id;
  const profile = await profileService.getProfile(userId);

  if (!profile) {
    return reply.status(404).send({ error: "User not found" });
  }

  const updated = await profileService.setProfileImage(userId, null);

  if (!updated) {
    return reply.status(404).send({ error: "User not found" });
  }

  await deleteLocalAvatar(profile.image);
  return reply.send(toUserDto(updated));
}

export async function getAvatarFile(
  request: FastifyRequest<{
    Params: { filename: string };
  }>,
  reply: FastifyReply
) {
  const avatarFile = await getLocalAvatarFile(request.params.filename);

  if (!avatarFile) {
    return reply.status(404).send({ error: "Avatar not found" });
  }

  reply.header("Cache-Control", "public, max-age=86400");
  return reply.type(avatarFile.contentType).send(createReadStream(avatarFile.filePath));
}
