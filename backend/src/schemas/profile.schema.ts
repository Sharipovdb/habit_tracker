export const updateProfileSchema = {
  body: {
    type: "object" as const,
    properties: {
      name: { type: "string" as const, minLength: 1 },
      age: { type: "number" as const, minimum: 1, maximum: 150 },
      height: { type: "number" as const, minimum: 30, maximum: 300 },
      weight: { type: "number" as const, minimum: 10, maximum: 500 },
    },
  },
};
