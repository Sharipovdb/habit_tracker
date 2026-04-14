import type { FastifyRequest, FastifyReply } from "fastify";
import type { AuthCredentials, AuthResponse } from "@shared";
import {
  createUser,
  findUserByEmail,
  verifyPassword,
} from "../services/auth.service";
import { toUserDto } from "../utils/api-contracts";

export async function register(
  request: FastifyRequest<{
    Body: AuthCredentials;
  }>,
  reply: FastifyReply
) {
  const { email, password } = request.body;

  const existing = await findUserByEmail(email);
  if (existing) {
    return reply.status(409).send({ error: "Email already registered" });
  }

  const user = await createUser(email, password);
  const token = request.server.jwt.sign({ id: user.id, email: user.email });
  const response: AuthResponse = { user: toUserDto(user), token };

  return reply.status(201).send(response);
}

export async function login(
  request: FastifyRequest<{
    Body: AuthCredentials;
  }>,
  reply: FastifyReply
) {
  const { email, password } = request.body;

  const user = await findUserByEmail(email);
  if (!user) {
    return reply.status(401).send({ error: "Invalid email or password" });
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return reply.status(401).send({ error: "Invalid email or password" });
  }

  const token = request.server.jwt.sign({ id: user.id, email: user.email });
  const response: AuthResponse = {
    user: toUserDto({
      id: user.id,
      email: user.email,
      name: user.name,
      age: user.age,
      height: user.height,
      weight: user.weight,
      createdAt: user.createdAt,
    }),
    token,
  };

  return reply.send(response);
}
