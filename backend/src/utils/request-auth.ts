import type { FastifyRequest } from "fastify";

export function getRequestUserId(request: FastifyRequest) {
  return request.authSession.user.id;
}