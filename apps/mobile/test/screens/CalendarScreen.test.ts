import type { SavedItem } from "@milkbox/shared";
import {
  formatScheduleTime,
  formatTimeOfDay,
  groupScheduleItems,
  sortScheduleItemsByTime,
} from "../../src/screens/CalendarScreen";

const baseItem: SavedItem = {
  color: "#7986CB",
  id: 1,
  text: "テストタスク",
  date: "2026-01-06T00:00:00",
  notificationEnabled: true,
  notificationMinutesBefore: 30,
};

describe("formatTimeOfDay", () => {
  it("returns null when the value is undefined", () => {
    expect(formatTimeOfDay(undefined)).toBeNull();
  });

  it("returns null when the value has no time component", () => {
    expect(formatTimeOfDay("2026-01-06")).toBeNull();
  });

  it("returns null when the value cannot be parsed as a date", () => {
    expect(formatTimeOfDay("invalidT00:00:00")).toBeNull();
  });

  it("formats a valid datetime as HH:mm", () => {
    expect(formatTimeOfDay("2026-01-06T09:05:00")).toBe("09:05");
  });
});

describe("formatScheduleTime", () => {
  it("shows a start–end range when both are set", () => {
    const item: SavedItem = {
      ...baseItem,
      startDate: "2026-01-06T09:00:00",
      endDate: "2026-01-06T10:30:00",
    };

    expect(formatScheduleTime(item)).toBe("09:00 〜 10:30");
  });

  it("shows only the start time when endDate is absent", () => {
    const item: SavedItem = { ...baseItem, startDate: "2026-01-06T09:00:00" };

    expect(formatScheduleTime(item)).toBe("09:00");
  });

  it("shows only the end time when startDate is absent", () => {
    const item: SavedItem = { ...baseItem, endDate: "2026-01-06T18:00:00" };

    expect(formatScheduleTime(item)).toBe("〜 18:00");
  });

  it("shows 終日 for a weekday-repeating item with no start/end time, ignoring item.date", () => {
    const item: SavedItem = { ...baseItem, weekdays: JSON.stringify([1, 3, 5]) };

    expect(formatScheduleTime(item)).toBe("終日");
  });

  it("falls back to item.date's time when start/end and weekdays are absent", () => {
    const item: SavedItem = { ...baseItem, date: "2026-01-06T14:20:00" };

    expect(formatScheduleTime(item)).toBe("14:20");
  });

  it("shows 終日 when item.date has no time component either", () => {
    const item: SavedItem = { ...baseItem, date: "2026-01-06" };

    expect(formatScheduleTime(item)).toBe("終日");
  });
});

describe("groupScheduleItems", () => {
  it("groups tasks by category and orders tasks by time", () => {
    const result = groupScheduleItems([
      { ...baseItem, id: 1, categoryId: 10, categoryName: "仕事", startDate: "2026-01-06T11:00:00" },
      { ...baseItem, id: 2, categoryId: 20, categoryName: "個人", startDate: "2026-01-06T10:00:00" },
      { ...baseItem, id: 3, categoryId: 10, categoryName: "仕事", startDate: "2026-01-06T09:00:00" },
    ]);

    expect(result).toHaveLength(2);
    expect(result.find((group) => group.key === "10")?.items.map((item) => item.id)).toEqual([3, 1]);
  });

  it("groups all uncategorized tasks into one category", () => {
    const result = groupScheduleItems([
      { ...baseItem, id: 1 },
      { ...baseItem, id: 2 },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].categoryName).toBe("カテゴリ指定なし");
    expect(result[0].items.map((item) => item.id)).toEqual([1, 2]);
  });
});

describe("sortScheduleItemsByTime", () => {
  it("orders tasks across categories by time without mutating the input", () => {
    const items = [
      { ...baseItem, id: 1, categoryId: 10, startDate: "2026-01-06T15:00:00" },
      { ...baseItem, id: 2, categoryId: 20, startDate: "2026-01-06T09:00:00" },
      { ...baseItem, id: 3, startDate: "2026-01-06T12:00:00" },
    ];

    expect(sortScheduleItemsByTime(items).map((item) => item.id)).toEqual([2, 3, 1]);
    expect(items.map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it("sorts weekday-repeating items first, ignoring their date's incidental creation time", () => {
    const items = [
      { ...baseItem, id: 1, startDate: "2026-01-06T08:00:00" },
      // date holds a late creation timestamp that must NOT be used as a sort key
      { ...baseItem, id: 2, date: "2026-01-06T23:30:00", weekdays: JSON.stringify([1, 3, 5]) },
      { ...baseItem, id: 3, startDate: "2026-01-06T20:00:00" },
    ];

    expect(sortScheduleItemsByTime(items).map((item) => item.id)).toEqual([2, 1, 3]);
  });
});
