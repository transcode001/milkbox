import {
  buildMonthDates,
  buildYearDates,
  createDateKey,
  daysInMonth,
  formatDayLabel,
  formatMonthNumberLabel,
  formatYearLabel,
  moveMonths,
  moveYears,
} from "../../src/utils/calendarDates";

describe("daysInMonth", () => {
  it("returns the correct day count, including leap-year February", () => {
    expect(daysInMonth(2026, 1)).toBe(28); // 2026-02 (not a leap year)
    expect(daysInMonth(2024, 1)).toBe(29); // 2024-02 (leap year)
    expect(daysInMonth(2026, 8)).toBe(30); // 2026-09
  });
});

describe("buildMonthDates", () => {
  it("returns exactly the days within the anchor's month, in order, with no padding from adjacent months", () => {
    const dates = buildMonthDates(new Date(2026, 8, 15)); // 2026-09

    expect(dates).toHaveLength(30);
    expect(createDateKey(dates[0])).toBe("2026-09-01");
    expect(createDateKey(dates[dates.length - 1])).toBe("2026-09-30");
  });
});

describe("buildYearDates", () => {
  it("returns every day of the anchor's year, flattened across all 12 months", () => {
    const dates = buildYearDates(new Date(2026, 5, 1)); // 2026

    expect(dates).toHaveLength(365); // 2026 is not a leap year
    expect(createDateKey(dates[0])).toBe("2026-01-01");
    expect(createDateKey(dates[dates.length - 1])).toBe("2026-12-31");
  });
});

describe("moveMonths", () => {
  it("shifts by whole months, normalizing to the 1st (avoids day-of-month rollover)", () => {
    expect(createDateKey(moveMonths(new Date(2026, 0, 31), 1))).toBe("2026-02-01");
    expect(createDateKey(moveMonths(new Date(2026, 0, 15), -1))).toBe("2025-12-01");
  });
});

describe("moveYears", () => {
  it("shifts by whole years, keeping the month", () => {
    expect(createDateKey(moveYears(new Date(2026, 5, 15), 1))).toBe("2027-06-01");
    expect(createDateKey(moveYears(new Date(2026, 5, 15), -2))).toBe("2024-06-01");
  });
});

describe("label formatters", () => {
  it("formats day/month/year labels without extraneous parts", () => {
    const date = new Date(2026, 8, 24);
    expect(formatDayLabel(date)).toBe("9月24日");
    expect(formatMonthNumberLabel(date)).toBe("9月");
    expect(formatYearLabel(date)).toBe("2026年");
  });
});
