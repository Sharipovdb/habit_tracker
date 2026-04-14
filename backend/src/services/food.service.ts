import type { FoodNutrients, FoodSearchItem, FoodSearchResponse } from "@shared";

const OPEN_FOOD_FACTS_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";
const DEFAULT_USER_AGENT =
  process.env.OPEN_FOOD_FACTS_USER_AGENT || "HabitTracker/1.0 (contact@example.com)";
const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;
const STALE_CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_SEARCH_ATTEMPTS = 2;

const searchCache = new Map<string, { response: FoodSearchResponse; expiresAt: number; staleAt: number }>();

interface OpenFoodFactsSearchResponse {
  products?: OpenFoodFactsProduct[];
}

interface OpenFoodFactsProduct {
  code?: string;
  product_name?: string;
  image_url?: string;
  nutrition_grades?: string;
  nutriments?: OpenFoodFactsNutriments;
}

interface OpenFoodFactsNutriments {
  "energy-kcal_100g"?: number;
  energy_100g?: number;
  proteins_100g?: number;
  fat_100g?: number;
  carbohydrates_100g?: number;
}

export class FoodSearchError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = "FoodSearchError";
    this.statusCode = statusCode;
  }
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function getCachedSearch(query: string): { response: FoodSearchResponse; isFresh: boolean } | null {
  const cached = searchCache.get(query);
  if (!cached) {
    return null;
  }

  const now = Date.now();
  if (cached.staleAt <= now) {
    searchCache.delete(query);
    return null;
  }

  return {
    response: cached.response,
    isFresh: cached.expiresAt > now,
  };
}

function setCachedSearch(query: string, response: FoodSearchResponse) {
  const now = Date.now();
  searchCache.set(query, {
    response,
    expiresAt: now + SEARCH_CACHE_TTL_MS,
    staleAt: now + STALE_CACHE_TTL_MS,
  });
}

function asNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 10) / 10;
  }

  return null;
}

function toCaloriesPer100g(nutriments?: OpenFoodFactsNutriments): number | null {
  if (!nutriments) {
    return null;
  }

  const kcal = asNullableNumber(nutriments["energy-kcal_100g"]);
  if (kcal !== null) {
    return kcal;
  }

  const energyKj = asNullableNumber(nutriments.energy_100g);
  if (energyKj === null) {
    return null;
  }

  return Math.round((energyKj / 4.184) * 10) / 10;
}

function toPer100g(nutriments?: OpenFoodFactsNutriments): FoodNutrients {
  return {
    calories: toCaloriesPer100g(nutriments),
    proteins: asNullableNumber(nutriments?.proteins_100g),
    fat: asNullableNumber(nutriments?.fat_100g),
    carbohydrates: asNullableNumber(nutriments?.carbohydrates_100g),
  };
}

function hasUsefulNutrition(per100g: FoodNutrients): boolean {
  return Object.values(per100g).some((value) => value !== null);
}

function normalizeProduct(product: OpenFoodFactsProduct): FoodSearchItem | null {
  const code = product.code?.trim();
  if (!code) {
    return null;
  }

  const name = product.product_name?.trim();
  const per100g = toPer100g(product.nutriments);

  if (!name && !hasUsefulNutrition(per100g)) {
    return null;
  }

  return {
    code,
    name: name || `Product ${code}`,
    imageUrl: product.image_url?.trim() || null,
    nutritionGrade: product.nutrition_grades?.trim() || null,
    per100g,
  };
}

function normalizeResponse(query: string, data: OpenFoodFactsSearchResponse): FoodSearchResponse {
  const items = (data.products ?? [])
    .map(normalizeProduct)
    .filter((item): item is FoodSearchItem => item !== null);

  return {
    query,
    items,
  };
}

async function fetchOpenFoodFacts(query: string): Promise<FoodSearchResponse> {
  const params = new URLSearchParams({
    search_terms: query,
    json: "1",
    page_size: "10",
    fields: "code,product_name,image_url,nutrition_grades,nutriments",
  });

  let lastError: FoodSearchError | null = null;

  for (let attempt = 1; attempt <= MAX_SEARCH_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(`${OPEN_FOOD_FACTS_SEARCH_URL}?${params.toString()}`, {
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(8000),
      });
      const contentType = response.headers.get("content-type") || "";
      const bodyText = await response.text();
      const looksLikeHtml = bodyText.trimStart().startsWith("<") || bodyText.includes("Page temporarily unavailable");

      if (!response.ok || looksLikeHtml || !contentType.toLowerCase().includes("json")) {
        const isTemporaryFailure = response.status === 502 || response.status === 503 || looksLikeHtml;
        lastError = new FoodSearchError(
          isTemporaryFailure
            ? "Open Food Facts is temporarily unavailable. Please try again in a moment."
            : "Open Food Facts returned an unexpected response.",
          isTemporaryFailure ? 503 : 502
        );

        if (attempt < MAX_SEARCH_ATTEMPTS && isTemporaryFailure) {
          await sleep(350 * attempt);
          continue;
        }

        throw lastError;
      }

      let data: OpenFoodFactsSearchResponse;
      try {
        data = JSON.parse(bodyText) as OpenFoodFactsSearchResponse;
      } catch {
        lastError = new FoodSearchError("Open Food Facts returned invalid JSON.", 502);

        if (attempt < MAX_SEARCH_ATTEMPTS) {
          await sleep(350 * attempt);
          continue;
        }

        throw lastError;
      }

      return normalizeResponse(query, data);
    } catch (error) {
      if (error instanceof FoodSearchError) {
        lastError = error;
      } else {
        lastError = new FoodSearchError("Failed to fetch food data from Open Food Facts.", 503);
      }

      if (attempt < MAX_SEARCH_ATTEMPTS) {
        await sleep(350 * attempt);
        continue;
      }
    }
  }

  throw lastError ?? new FoodSearchError("Failed to fetch food data from Open Food Facts.", 503);
}

export async function searchFood(query: string): Promise<FoodSearchResponse> {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    throw new FoodSearchError("Search query must be at least 2 characters long.", 400);
  }

  const cached = getCachedSearch(normalizedQuery);
  if (cached?.isFresh) {
    return cached.response;
  }

  try {
    const response = await fetchOpenFoodFacts(normalizedQuery);
    setCachedSearch(normalizedQuery, response);
    return response;
  } catch (error) {
    if (cached) {
      return cached.response;
    }

    if (error instanceof FoodSearchError) {
      throw error;
    }

    throw new FoodSearchError("Failed to fetch food data from Open Food Facts.", 503);
  }
}