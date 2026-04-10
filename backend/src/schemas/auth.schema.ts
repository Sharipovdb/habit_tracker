export const registerSchema = {
  body: {
    type: "object" as const,
    required: ["email", "password"],
    properties: {
      email: { type: "string" as const, format: "email" },
      password: { type: "string" as const, minLength: 6 },
    },
  },
};

export const loginSchema = {
  body: {
    type: "object" as const,
    required: ["email", "password"],
    properties: {
      email: { type: "string" as const, format: "email" },
      password: { type: "string" as const },
    },
  },
};
