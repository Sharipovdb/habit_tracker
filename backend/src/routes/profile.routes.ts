import type { FastifyInstance } from "fastify";
import { getProfile, updateProfile } from "../controllers/profile.controller";
import { updateProfileSchema } from "../schemas/profile.schema";

export default async function profileRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", fastify.authenticate);

  fastify.get("/", getProfile);
  fastify.put("/", { schema: updateProfileSchema }, updateProfile);
}
