export const foodSearchSchema = {
  querystring: {
    type: "object" as const,
    required: ["query"],
    properties: {
      query: { type: "string" as const, minLength: 2, maxLength: 100 },
    },
  },
};