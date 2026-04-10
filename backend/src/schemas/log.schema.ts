export const createRunLogSchema = {
  body: {
    type: "object" as const,
    required: ["distance"],
    properties: {
      distance: { type: "number" as const, minimum: 0.1 },
      pace: { type: "number" as const, minimum: 1, maximum: 30 },
      weight: { type: "number" as const, minimum: 10, maximum: 500 },
      date: { type: "string" as const },
    },
  },
};

export const createDietLogSchema = {
  body: {
    type: "object" as const,
    required: ["score"],
    properties: {
      score: { type: "number" as const, minimum: 1, maximum: 10 },
      note: { type: "string" as const, nullable: true },
    },
  },
};

export const createSleepLogSchema = {
  body: {
    type: "object" as const,
    required: ["sleepHours"],
    properties: {
      sleepHours: { type: "number" as const, minimum: 0, maximum: 24 },
    },
  },
};

export const createOtherLogSchema = {
  body: {
    type: "object" as const,
    required: ["completed"],
    properties: {
      completed: { type: "boolean" as const },
    },
  },
};
