import { isEndDateBeforeStartDate } from "../../src/utils/dateValidation";

describe("isEndDateBeforeStartDate", () => {
  it("returns false when start date is not set", () => {
    const end = new Date(2026, 3, 9, 23, 59, 59);

    expect(isEndDateBeforeStartDate(null, end)).toBe(false);
  });

  it("returns false when end date is not set", () => {
    const start = new Date(2026, 3, 10, 10, 0, 0);

    expect(isEndDateBeforeStartDate(start, null)).toBe(false);
  });

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

  it("returns true when end time is earlier than start time on the same day", () => {
    const start = new Date(2026, 3, 10, 21, 0, 0);
    const end = new Date(2026, 3, 10, 8, 0, 0);

    expect(isEndDateBeforeStartDate(start, end)).toBe(true);
  });

  it("returns false when start and end are exactly the same datetime", () => {
    const start = new Date(2026, 3, 10, 12, 0, 0);
    const end = new Date(2026, 3, 10, 12, 0, 0);

    expect(isEndDateBeforeStartDate(start, end)).toBe(false);
  });

  it("returns false when end date is after start date", () => {
    const start = new Date(2026, 3, 10, 0, 0, 0);
    const end = new Date(2026, 3, 11, 0, 0, 0);

    expect(isEndDateBeforeStartDate(start, end)).toBe(false);
  });
});
