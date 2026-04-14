import api from "./client";
import type { FoodSearchResponse } from "../types";

export async function searchFood(query: string): Promise<FoodSearchResponse> {
  const { data } = await api.get<FoodSearchResponse>("/food/search", {
    params: { query },
  });

  return data;
}