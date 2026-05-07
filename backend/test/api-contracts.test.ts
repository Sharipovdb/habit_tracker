import { describe, expect, it } from "vitest";
import {
  asHabitType,
  toUserDto,
  toHabitDto,
  toHabitLogDto,
} from "../src/utils/api-contracts.ts";

// ---------------------------------------------------------------------------
// asHabitType
// ---------------------------------------------------------------------------
describe("asHabitType", () => {
  it("accepts all valid habit type strings", () => {
    expect(asHabitType("run")).toBe("run");
    expect(asHabitType("diet")).toBe("diet");
    expect(asHabitType("sleep")).toBe("sleep");
    expect(asHabitType("other")).toBe("other");
  });

  it("throws on an unknown type string", () => {
    expect(() => asHabitType("yoga")).toThrow("Unknown habit type: yoga");
    expect(() => asHabitType("")).toThrow();
    expect(() => asHabitType("Run")).toThrow(); // case-sensitive
  });
});

// ---------------------------------------------------------------------------
// toUserDto
// ---------------------------------------------------------------------------
describe("toUserDto", () => {
  const BASE_USER = {
    id: "user-1",
    email: "user@example.com",
    name: "Alice",
    image: null,
    age: null,
    height: null,
    weight: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
  };

  it("maps all fields when fully provided", () => {
    const dto = toUserDto({
      ...BASE_USER,
      notificationEmail: "notify@example.com",
      reminderEnabled: true,
      timezone: "Europe/Moscow",
    });

    expect(dto.id).toBe("user-1");
    expect(dto.email).toBe("user@example.com");
    expect(dto.name).toBe("Alice");
    expect(dto.notificationEmail).toBe("notify@example.com");
    expect(dto.reminderEnabled).toBe(true);
    expect(dto.timezone).toBe("Europe/Moscow");
    expect(dto.createdAt).toBe("2024-01-01T00:00:00.000Z");
  });

  it("defaults reminderEnabled to false when not provided", () => {
    const dto = toUserDto(BASE_USER);
    expect(dto.reminderEnabled).toBe(false);
  });

  it("defaults timezone to UTC when not provided", () => {
    const dto = toUserDto(BASE_USER);
    expect(dto.timezone).toBe("UTC");
  });

  it("maps notificationEmail to null when not provided", () => {
    const dto = toUserDto(BASE_USER);
    expect(dto.notificationEmail).toBeNull();
  });

  it("accepts a string createdAt and returns it as-is", () => {
    const dto = toUserDto({ ...BASE_USER, createdAt: "2024-06-15T10:00:00.000Z" });
    expect(dto.createdAt).toBe("2024-06-15T10:00:00.000Z");
  });
});

// ---------------------------------------------------------------------------
// toHabitDto
// ---------------------------------------------------------------------------
describe("toHabitDto", () => {
  it("maps all fields including type coercion", () => {
    const dto = toHabitDto({
      id: "habit-1",
      userId: "user-1",
      title: "Running Stats",
      type: "run",
      target: "5km",
      createdAt: new Date("2024-03-01T00:00:00.000Z"),
    });

    expect(dto.id).toBe("habit-1");
    expect(dto.userId).toBe("user-1");
    expect(dto.title).toBe("Running Stats");
    expect(dto.type).toBe("run");
    expect(dto.target).toBe("5km");
    expect(dto.createdAt).toBe("2024-03-01T00:00:00.000Z");
  });

  it("preserves null target", () => {
    const dto = toHabitDto({
      id: "habit-2",
      userId: "user-1",
      title: "Sleep Control",
      type: "sleep",
      target: null,
      createdAt: new Date("2024-03-01T00:00:00.000Z"),
    });

    expect(dto.target).toBeNull();
  });

  it("throws when habit type is unknown", () => {
    expect(() =>
      toHabitDto({
        id: "habit-3",
        userId: "user-1",
        title: "Unknown",
        type: "unknown_type",
        target: null,
        createdAt: new Date(),
      })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// toHabitLogDto
// ---------------------------------------------------------------------------
describe("toHabitLogDto", () => {
  it("maps all fields with a Date createdAt", () => {
    const dto = toHabitLogDto({
      id: "log-1",
      habitId: "habit-1",
      date: new Date("2024-05-07T00:00:00.000Z"),
      data: { distance: 5, pace: 6, duration: 30, caloriesBurned: 363 },
    });

    expect(dto.id).toBe("log-1");
    expect(dto.habitId).toBe("habit-1");
    expect(dto.date).toBe("2024-05-07"); // date-only string
    expect(dto.data).toEqual({ distance: 5, pace: 6, duration: 30, caloriesBurned: 363 });
  });

  it("maps fields with a string date (returns date-only portion)", () => {
    const dto = toHabitLogDto({
      id: "log-2",
      habitId: "habit-2",
      date: "2024-05-07",
      data: { completed: true },
    });

    expect(dto.date).toBe("2024-05-07");
  });

  it("passes a plain string date through unchanged", () => {
    // The DB date column returns a date-only string; the DTO preserves it as-is.
    const dto = toHabitLogDto({
      id: "log-3",
      habitId: "habit-3",
      date: "2024-05-07",
      data: { completed: false },
    });

    expect(dto.date).toBe("2024-05-07");
  });
});
