import { describe, expect, it } from "vitest";
import {
  isValidTimeZone,
  normalizeTimeZone,
  getZonedDateTimeParts,
  getLocalDateString,
} from "../src/utils/date-time.ts";

// ---------------------------------------------------------------------------
// isValidTimeZone
// ---------------------------------------------------------------------------
describe("isValidTimeZone", () => {
  it("returns true for well-known IANA time zones", () => {
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Europe/Moscow")).toBe(true);
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("Asia/Tashkent")).toBe(true);
  });

  it("returns false for invalid or unknown time zone strings", () => {
    expect(isValidTimeZone("Not/A/Zone")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone("Random_String")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// normalizeTimeZone
// ---------------------------------------------------------------------------
describe("normalizeTimeZone", () => {
  it("returns the provided time zone when it is valid", () => {
    expect(normalizeTimeZone("Europe/Moscow")).toBe("Europe/Moscow");
    expect(normalizeTimeZone("America/Los_Angeles")).toBe("America/Los_Angeles");
  });

  it("falls back to the fallback when the primary is invalid", () => {
    expect(normalizeTimeZone("BadZone", "UTC")).toBe("UTC");
    expect(normalizeTimeZone("BadZone", "Europe/London")).toBe("Europe/London");
  });

  it("falls back to UTC when both primary and fallback are invalid", () => {
    expect(normalizeTimeZone("BadZone", "AlsoBad")).toBe("UTC");
  });

  it("falls back to default fallback (UTC) when primary is null", () => {
    expect(normalizeTimeZone(null)).toBe("UTC");
    expect(normalizeTimeZone(undefined)).toBe("UTC");
  });

  it("falls back to default fallback (UTC) when primary is an empty string", () => {
    expect(normalizeTimeZone("")).toBe("UTC");
  });
});

// ---------------------------------------------------------------------------
// getZonedDateTimeParts
// ---------------------------------------------------------------------------
describe("getZonedDateTimeParts", () => {
  it("returns correct parts for UTC", () => {
    const date = new Date("2026-05-07T14:30:45.000Z");
    const parts = getZonedDateTimeParts(date, "UTC");

    expect(parts.year).toBe("2026");
    expect(parts.month).toBe("05");
    expect(parts.day).toBe("07");
    expect(parts.hour).toBe(14);
    expect(parts.minute).toBe(30);
    expect(parts.second).toBe(45);
    expect(parts.timeZone).toBe("UTC");
  });

  it("converts UTC midnight to the correct local date in UTC+3 (Europe/Moscow)", () => {
    // 2026-05-01T22:30:00Z in Europe/Moscow (UTC+3) is 2026-05-02 01:30:00
    const date = new Date("2026-05-01T22:30:00.000Z");
    const parts = getZonedDateTimeParts(date, "Europe/Moscow");

    expect(parts.year).toBe("2026");
    expect(parts.month).toBe("05");
    expect(parts.day).toBe("02");
    expect(parts.hour).toBe(1); // 22 + 3 = 1 (next day)
  });

  it("handles negative UTC offset correctly (America/New_York, UTC-4 in summer)", () => {
    // 2026-05-01T02:30:00Z in New York (UTC-4) is 2026-04-30 22:30:00
    const date = new Date("2026-05-01T02:30:00.000Z");
    const parts = getZonedDateTimeParts(date, "America/New_York");

    expect(parts.year).toBe("2026");
    expect(parts.month).toBe("04");
    expect(parts.day).toBe("30");
    expect(parts.hour).toBe(22);
  });

  it("falls back to UTC for an invalid time zone", () => {
    const date = new Date("2026-05-07T10:00:00.000Z");
    const parts = getZonedDateTimeParts(date, "Invalid/Zone");

    expect(parts.timeZone).toBe("UTC");
    expect(parts.hour).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// getLocalDateString
// ---------------------------------------------------------------------------
describe("getLocalDateString", () => {
  it("returns YYYY-MM-DD string in UTC", () => {
    const date = new Date("2026-01-15T12:00:00.000Z");
    expect(getLocalDateString(date, "UTC")).toBe("2026-01-15");
  });

  it("returns the local date one day ahead in UTC+3 when UTC time is past 21:00", () => {
    // 2026-01-15T22:00:00Z + 3h = 2026-01-16 01:00 Moscow time
    const date = new Date("2026-01-15T22:00:00.000Z");
    expect(getLocalDateString(date, "Europe/Moscow")).toBe("2026-01-16");
  });

  it("returns the local date one day behind in UTC-5 when UTC time is early morning", () => {
    // 2026-01-15T03:00:00Z - 5h = 2026-01-14 22:00 New York
    const date = new Date("2026-01-15T03:00:00.000Z");
    expect(getLocalDateString(date, "America/New_York")).toBe("2026-01-14");
  });

  it("zero-pads month and day correctly", () => {
    const date = new Date("2026-03-05T00:00:00.000Z");
    expect(getLocalDateString(date, "UTC")).toBe("2026-03-05");
  });
});
