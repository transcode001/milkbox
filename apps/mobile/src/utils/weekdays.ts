const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function parseWeekdays(value?: string): number[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (weekday): weekday is number =>
        typeof weekday === "number" && Number.isInteger(weekday) && weekday >= 0 && weekday <= 6,
    );
  } catch {
    return [];
  }
}

export function formatWeekdayLabels(value?: string): string | null {
  const labels = parseWeekdays(value).map((weekday) => WEEKDAY_LABELS[weekday]);
  return labels.length > 0 ? `毎週 ${labels.join("・")}` : null;
}
