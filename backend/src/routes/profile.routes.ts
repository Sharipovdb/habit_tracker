import type { FastifyInstance } from "fastify";
import { getProfile, updateProfile } from "../controllers/profile.controller.js";
import { updateProfileSchema } from "../schemas/profile.schema.js";

export default async function profileRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", fastify.authenticate);

  fastify.get("/", getProfile);
  fastify.put("/", { schema: updateProfileSchema }, updateProfile);
}
