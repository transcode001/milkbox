import { findNextOccurrence, formatRecurrenceLabel, occursOnDate } from "../../src/utils/recurrence";

describe("occursOnDate", () => {
  it("returns false when there is no recurrence or no anchor startDate", () => {
    expect(occursOnDate({ startDate: "2026-01-01" }, new Date(2026, 0, 1))).toBe(false);
    expect(occursOnDate({ recurrence: { type: "monthly" } }, new Date(2026, 0, 1))).toBe(false);
  });

  it("returns false for dates before the anchor", () => {
    const item = { startDate: "2026-01-15", recurrence: { type: "monthly" as const } };
    expect(occursOnDate(item, new Date(2025, 11, 15))).toBe(false);
  });

  describe("biweekly", () => {
    const item = { startDate: "2026-01-01", recurrence: { type: "biweekly" as const } }; // 2026-01-01 is a Thursday

    it("matches the anchor date itself and every 14 days after", () => {
      expect(occursOnDate(item, new Date(2026, 0, 1))).toBe(true);
      expect(occursOnDate(item, new Date(2026, 0, 15))).toBe(true);
      expect(occursOnDate(item, new Date(2026, 0, 29))).toBe(true);
    });

    it("does not match the in-between week's same weekday", () => {
      expect(occursOnDate(item, new Date(2026, 0, 8))).toBe(false);
    });

    it("does not match a different weekday", () => {
      expect(occursOnDate(item, new Date(2026, 0, 16))).toBe(false); // Friday
    });
  });

  describe("monthly", () => {
    it("matches the same day-of-month in later months", () => {
      const item = { startDate: "2026-01-15", recurrence: { type: "monthly" as const } };
      expect(occursOnDate(item, new Date(2026, 1, 15))).toBe(true);
      expect(occursOnDate(item, new Date(2026, 5, 15))).toBe(true);
      expect(occursOnDate(item, new Date(2026, 1, 14))).toBe(false);
    });

    it("clamps to the last day of a shorter month", () => {
      const item = { startDate: "2026-01-31", recurrence: { type: "monthly" as const } };
      // February 2026 has 28 days
      expect(occursOnDate(item, new Date(2026, 1, 28))).toBe(true);
      expect(occursOnDate(item, new Date(2026, 3, 30))).toBe(true); // April has 30 days
      expect(occursOnDate(item, new Date(2026, 2, 31))).toBe(true); // March has 31, matches exactly
    });
  });

  describe("everyNDays", () => {
    const item = { startDate: "2026-01-01", recurrence: { type: "everyNDays" as const, days: 3 } };

    it("matches every N days from the anchor", () => {
      expect(occursOnDate(item, new Date(2026, 0, 1))).toBe(true);
      expect(occursOnDate(item, new Date(2026, 0, 4))).toBe(true);
      expect(occursOnDate(item, new Date(2026, 0, 7))).toBe(true);
    });

    it("does not match the days in between", () => {
      expect(occursOnDate(item, new Date(2026, 0, 2))).toBe(false);
      expect(occursOnDate(item, new Date(2026, 0, 3))).toBe(false);
    });
  });
});

describe("findNextOccurrence", () => {
  it("returns the search start date itself when it already matches", () => {
    const item = { startDate: "2026-01-01", recurrence: { type: "everyNDays" as const, days: 5 } };
    expect(findNextOccurrence(item, new Date(2026, 0, 1))).toEqual(new Date(2026, 0, 1));
  });

  it("finds the next matching date after the search start", () => {
    const item = { startDate: "2026-01-01", recurrence: { type: "everyNDays" as const, days: 5 } };
    expect(findNextOccurrence(item, new Date(2026, 0, 2))).toEqual(new Date(2026, 0, 6));
  });

  it("finds the next monthly occurrence across a month boundary", () => {
    const item = { startDate: "2026-01-31", recurrence: { type: "monthly" as const } };
    expect(findNextOccurrence(item, new Date(2026, 1, 1))).toEqual(new Date(2026, 1, 28));
  });

  it("returns null when the item has no recurrence", () => {
    expect(findNextOccurrence({ startDate: "2026-01-01" }, new Date(2026, 0, 1))).toBeNull();
  });

  it("starts from the anchor startDate, not from a search date that precedes it", () => {
    // 「2か月後からN日ごと」を今日作成したケース: fromは今日(開始日より前)。
    const item = { startDate: "2026-03-01", recurrence: { type: "everyNDays" as const, days: 3 } };
    expect(findNextOccurrence(item, new Date(2026, 0, 1))).toEqual(new Date(2026, 2, 1));
  });

  it("starts from the anchor startDate for monthly/biweekly too when it is later than the search date", () => {
    const monthly = { startDate: "2026-05-15", recurrence: { type: "monthly" as const } };
    expect(findNextOccurrence(monthly, new Date(2026, 0, 1))).toEqual(new Date(2026, 4, 15));

    const biweekly = { startDate: "2026-05-15", recurrence: { type: "biweekly" as const } };
    expect(findNextOccurrence(biweekly, new Date(2026, 0, 1))).toEqual(new Date(2026, 4, 15));
  });
});

describe("formatRecurrenceLabel", () => {
  it("labels each recurrence type in Japanese, including the day count for everyNDays", () => {
    expect(formatRecurrenceLabel({ type: "biweekly" })).toBe("隔週");
    expect(formatRecurrenceLabel({ type: "monthly" })).toBe("毎月");
    expect(formatRecurrenceLabel({ type: "everyNDays", days: 5 })).toBe("5日ごと");
  });
});
