export function isEndDateBeforeStartDate(startDate: Date | null, endDate: Date | null): boolean {
  if (!startDate || !endDate) {
    return false;
  }

  const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  return endDateOnly < startDateOnly;
}
