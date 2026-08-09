const startOfDay = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export function isEndDateBeforeStartDate(
  startDate: Date | null,
  endDate: Date | null,
  startHasTime = true,
  endHasTime = true,
): boolean {
  if (!startDate || !endDate) {
    return false;
  }

  const startValue = startHasTime ? startDate.getTime() : startOfDay(startDate);
  const endValue = endHasTime ? endDate.getTime() : startOfDay(endDate);

  return endValue < startValue;
}

export function toSavedDate(date: Date, hasTime: boolean): string {
  if (hasTime) return date.toISOString();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function resolveScheduleWeekdays(
  hasDate: boolean,
  inheritedWeekdays: number[],
  selectedWeekdays: number[],
): number[] {
  if (hasDate) return [];
  return inheritedWeekdays.length > 0 ? inheritedWeekdays : selectedWeekdays;
}
