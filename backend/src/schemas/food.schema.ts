const foodNutrientsSchema = {
  type: "object" as const,
  required: ["calories", "proteins", "fat", "carbohydrates"],
  properties: {
    calories: { type: "number" as const, nullable: true },
    proteins: { type: "number" as const, nullable: true },
    fat: { type: "number" as const, nullable: true },
    carbohydrates: { type: "number" as const, nullable: true },
  },
};

const foodSearchItemSchema = {
  type: "object" as const,
  required: ["code", "name", "imageUrl", "nutritionGrade", "per100g"],
  properties: {
    code: { type: "string" as const },
    name: { type: "string" as const },
    imageUrl: { type: "string" as const, nullable: true },
    nutritionGrade: { type: "string" as const, nullable: true },
    per100g: foodNutrientsSchema,
  },
};

const errorResponseSchema = {
  type: "object" as const,
  required: ["error"],
  properties: {
    error: { type: "string" as const },
  },
};

export const foodSearchSchema = {
  summary: "Search food by name",
  description: "Ищет продукты в Open Food Facts и возвращает список с нутриентами на 100 г.",
  tags: ["Food"],
  security: [{ cookieAuth: [] }],
  querystring: {
    type: "object" as const,
    required: ["query"],
    properties: {
      query: {
        type: "string" as const,
        minLength: 2,
        maxLength: 100,
        description: "Поисковая строка, например: banana",
      },
    },
  },
  response: {
    200: {
      type: "object" as const,
      required: ["query", "items"],
      properties: {
        query: { type: "string" as const },
        items: {
          type: "array" as const,
          items: foodSearchItemSchema,
        },
      },
    },
    400: errorResponseSchema,
    503: errorResponseSchema,
  },
};