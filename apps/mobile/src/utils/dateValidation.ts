export function isEndDateBeforeStartDate(startDate: Date | null, endDate: Date | null): boolean {
  if (!startDate || !endDate) {
    return false;
  }

  return endDate.getTime() < startDate.getTime();
}
