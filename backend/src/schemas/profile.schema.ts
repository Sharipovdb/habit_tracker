export const updateProfileSchema = {
  body: {
    type: "object" as const,
    properties: {
      name: { type: "string" as const, minLength: 1 },
      age: { type: "number" as const, minimum: 1, maximum: 150 },
      height: { type: "number" as const, minimum: 30, maximum: 300 },
      weight: { type: "number" as const, minimum: 10, maximum: 500 },
      notificationEmail: {
        anyOf: [
          { type: "string" as const, format: "email" as const, minLength: 3, maxLength: 255 },
          { type: "null" as const },
        ],
      },
      reminderEnabled: { type: "boolean" as const },
      timezone: { type: "string" as const, minLength: 1, maxLength: 100 },
    },
  },
};
