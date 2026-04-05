import { isEndDateBeforeStartDate } from "../../src/utils/dateValidation";

describe("isEndDateBeforeStartDate", () => {
  it("returns true when end date is earlier than start date", () => {
    const start = new Date(2026, 3, 10, 10, 0, 0);
    const end = new Date(2026, 3, 9, 23, 59, 59);

    expect(isEndDateBeforeStartDate(start, end)).toBe(true);
  });

  it("returns false when dates are the same day", () => {
    const start = new Date(2026, 3, 10, 8, 0, 0);
    const end = new Date(2026, 3, 10, 21, 0, 0);

    expect(isEndDateBeforeStartDate(start, end)).toBe(false);
  });

  it("returns false when end date is after start date", () => {
    const start = new Date(2026, 3, 10, 0, 0, 0);
    const end = new Date(2026, 3, 11, 0, 0, 0);

    expect(isEndDateBeforeStartDate(start, end)).toBe(false);
  });
});
