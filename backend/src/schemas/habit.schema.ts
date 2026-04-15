const habitDtoSchema = {
  type: "object" as const,
  required: ["id", "userId", "title", "type", "target", "createdAt"],
  properties: {
    id: { type: "string" as const, format: "uuid" },
    userId: { type: "string" as const, format: "uuid" },
    title: { type: "string" as const },
    type: { type: "string" as const, enum: ["run", "diet", "sleep", "other"] },
    target: { type: "string" as const, nullable: true },
    createdAt: { type: "string" as const, format: "date-time" },
  },
};

const errorResponseSchema = {
  type: "object" as const,
  required: ["error"],
  properties: {
    error: { type: "string" as const },
  },
};

export const createHabitSchema = {
  summary: "Create a new habit",
  tags: ["Habits"],
  security: [{ cookieAuth: [] }],
  body: {
    type: "object" as const,
    required: ["title", "type"],
    properties: {
      title: { type: "string" as const, minLength: 1 },
      type: { type: "string" as const, enum: ["run", "diet", "sleep", "other"] },
      target: { type: "string" as const, nullable: true },
    },
  },
  response: {
    201: habitDtoSchema,
  },
};

export const habitIdParamsSchema = {
  type: "object" as const,
  required: ["id"],
  properties: {
    id: {
      type: "string" as const,
      format: "uuid",
      description: "UUID привычки",
    },
  },
};

export const getHabitSchema = {
  summary: "Get habit by id",
  description: "Пример схемы с params и response, который будет показан в Swagger UI.",
  tags: ["Habits"],
  security: [{ cookieAuth: [] }],
  params: habitIdParamsSchema,
  response: {
    200: habitDtoSchema,
    404: errorResponseSchema,
  },
};

export const deleteHabitSchema = {
  summary: "Delete habit by id",
  tags: ["Habits"],
  security: [{ cookieAuth: [] }],
  params: habitIdParamsSchema,
  response: {
    200: {
      type: "object" as const,
      required: ["message"],
      properties: {
        message: { type: "string" as const },
      },
    },
    404: errorResponseSchema,
  },
};
