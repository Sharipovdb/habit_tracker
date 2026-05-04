export function roundToSingleDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function asNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return roundToSingleDecimal(value);
  }

  if (typeof value === "string") {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
      return roundToSingleDecimal(numericValue);
    }
  }

  return null;
}
