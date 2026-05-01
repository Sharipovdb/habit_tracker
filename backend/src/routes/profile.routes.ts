import type { FastifyInstance } from "fastify";
import {
  deleteAvatar,
  getAvatarFile,
  getProfile,
  updateProfile,
  uploadAvatar,
} from "../controllers/profile.controller.js";
import { updateProfileSchema } from "../schemas/profile.schema.js";

export default async function profileRoutes(fastify: FastifyInstance) {
  fastify.get("/avatar/:filename", getAvatarFile);
  fastify.addHook("onRequest", fastify.authenticate);

  fastify.get("/", getProfile);
  fastify.put("/", { schema: updateProfileSchema }, updateProfile);
  fastify.post("/avatar", uploadAvatar);
  fastify.delete("/avatar", deleteAvatar);
}
