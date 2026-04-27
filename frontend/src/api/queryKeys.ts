export const queryKeys = {
  dashboard: {
    all: ["dashboard"] as const,
  },
  food: {
    search: (query: string) => ["food", "search", query] as const,
  },
  profile: {
    current: ["profile"] as const,
  },
  habits: {
    all: ["habits"] as const,
    logs: (habitId: string) => ["habits", "logs", habitId] as const,
    stats: (habitId: string) => ["habits", "stats", habitId] as const,
  },
};