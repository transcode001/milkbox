import {
  isEndDateBeforeStartDate,
  resolveScheduleWeekdays,
  toSavedDate,
} from "../../src/utils/dateValidation";

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

  it("ignores the hidden time-of-day when both dates are date-only and on the same day", () => {
    // Date-only selections still carry the wall-clock time from when the
    // date button was tapped internally; a same-day comparison must not
    // be affected by that incidental time difference.
    const start = new Date(2026, 3, 10, 21, 0, 0);
    const end = new Date(2026, 3, 10, 8, 0, 0);

    expect(isEndDateBeforeStartDate(start, end, false, false)).toBe(false);
  });

  it("still flags an earlier day when both dates are date-only", () => {
    const start = new Date(2026, 3, 10, 8, 0, 0);
    const end = new Date(2026, 3, 9, 21, 0, 0);

    expect(isEndDateBeforeStartDate(start, end, false, false)).toBe(true);
  });

  it("compares exact times when both dates have an explicit time", () => {
    const start = new Date(2026, 3, 10, 21, 0, 0);
    const end = new Date(2026, 3, 10, 8, 0, 0);

    expect(isEndDateBeforeStartDate(start, end, true, true)).toBe(true);
  });
});

describe("toSavedDate", () => {
  const date = new Date(2026, 7, 9, 14, 30);

  it("stores a date-only selection without a time component", () => {
    expect(toSavedDate(date, false)).toBe("2026-08-09");
  });

  it("stores an explicitly selected time as an ISO datetime", () => {
    expect(toSavedDate(date, true)).toBe(date.toISOString());
  });
});

describe("resolveScheduleWeekdays", () => {
  it("does not apply weekdays when a date is set", () => {
    expect(resolveScheduleWeekdays(true, [1, 3], [5])).toEqual([]);
  });

  it("inherits registered weekdays when a date is not set", () => {
    expect(resolveScheduleWeekdays(false, [1, 3], [5])).toEqual([1, 3]);
  });

  it("uses selected weekdays when there are no inherited weekdays", () => {
    expect(resolveScheduleWeekdays(false, [], [5])).toEqual([5]);
  });
});
