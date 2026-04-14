import type { FastifyReply, FastifyRequest } from "fastify";
import * as foodService from "../services/food.service";

export async function searchFood(
  request: FastifyRequest<{ Querystring: { query: string } }>,
  reply: FastifyReply
) {
  try {
    const result = await foodService.searchFood(request.query.query);
    return reply.send(result);
  } catch (error) {
    if (error instanceof foodService.FoodSearchError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }

    request.log.error(error);
    return reply.status(500).send({ error: "Unexpected error while searching food." });
  }
}