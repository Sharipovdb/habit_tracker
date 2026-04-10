import type { FastifyInstance } from "fastify";
import { register, login } from "../controllers/auth.controller";
import { registerSchema, loginSchema } from "../schemas/auth.schema";

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/register", { schema: registerSchema }, register);
  fastify.post("/login", { schema: loginSchema }, login);
}
