export const createHabitSchema = {
  body: {
    type: "object" as const,
    required: ["title", "type"],
    properties: {
      title: { type: "string" as const, minLength: 1 },
      type: { type: "string" as const, enum: ["run", "diet", "sleep", "other"] },
      target: { type: "string" as const, nullable: true },
    },
  },
};

export const habitParamsSchema = {
  params: {
    type: "object" as const,
    required: ["id"],
    properties: {
      id: { type: "string" as const, format: "uuid" },
    },
  },
};
