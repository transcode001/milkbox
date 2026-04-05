export function isEndDateBeforeStartDate(startDate: Date, endDate: Date): boolean {
  const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  return endDateOnly < startDateOnly;
}
