const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string) {
  const cacheKey = timeZone;
  const existing = formatterCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  formatterCache.set(cacheKey, formatter);
  return formatter;
}

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimeZone(timeZone: string | null | undefined, fallback = "UTC") {
  if (timeZone && isValidTimeZone(timeZone)) {
    return timeZone;
  }

  return isValidTimeZone(fallback) ? fallback : "UTC";
}

export function getZonedDateTimeParts(date: Date, timeZone: string) {
  const normalizedTimeZone = normalizeTimeZone(timeZone);
  const formatted = getFormatter(normalizedTimeZone).formatToParts(date);
  const lookup = Object.fromEntries(
    formatted
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  ) as Record<string, string>;

  return {
    year: lookup.year,
    month: lookup.month,
    day: lookup.day,
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
    second: Number(lookup.second),
    timeZone: normalizedTimeZone,
  };
}

export function getLocalDateString(date: Date, timeZone: string) {
  const parts = getZonedDateTimeParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}