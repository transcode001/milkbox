import type { SavedItem } from "@milkbox/shared";
import { NONE_REMINDER_VALUE } from "@milkbox/shared";
import { computeWeeklyTrigger, createReminderDate } from "../../src/services/notifications";

const baseItem: SavedItem = {
  id: 1,
  text: "テストタスク",
  date: "2026-01-01T00:00:00",
  notificationEnabled: true,
  notificationMinutesBefore: 30,
};

describe("createReminderDate", () => {
  it("subtracts notificationMinutesBefore from a startDate that includes a time", () => {
    const item: SavedItem = { ...baseItem, startDate: "2026-01-06T09:00:00" };

    const result = createReminderDate(item);

    expect(result).toEqual(new Date(2026, 0, 6, 8, 30, 0, 0));
  });

  it("defaults to 9:00 for a date-only startDate before applying the offset", () => {
    const item: SavedItem = { ...baseItem, startDate: "2026-01-06", notificationMinutesBefore: 60 };

    const result = createReminderDate(item);

    expect(result).toEqual(new Date(2026, 0, 6, 8, 0, 0, 0));
  });

  it("falls back to endDate (ignoring its time-of-day) when startDate is absent", () => {
    const item: SavedItem = { ...baseItem, endDate: "2026-01-06T15:30:00", notificationMinutesBefore: 15 };

    const result = createReminderDate(item);

    expect(result).toEqual(new Date(2026, 0, 6, 8, 45, 0, 0));
  });

  it("returns null when neither startDate nor endDate is set", () => {
    expect(createReminderDate(baseItem)).toBeNull();
  });

  it("returns null for an invalid startDate string", () => {
    const item: SavedItem = { ...baseItem, startDate: "not-a-date" };

    expect(createReminderDate(item)).toBeNull();
  });

  it("treats a 0-minute offset (開始時間) as notifying exactly at the event time", () => {
    const item: SavedItem = { ...baseItem, startDate: "2026-01-06T09:00:00", notificationMinutesBefore: 0 };

    const result = createReminderDate(item);

    expect(result).toEqual(new Date(2026, 0, 6, 9, 0, 0, 0));
  });

  it("clamps the なし sentinel value to 0 minutes instead of shifting into the future", () => {
    const item: SavedItem = {
      ...baseItem,
      startDate: "2026-01-06T09:00:00",
      notificationMinutesBefore: NONE_REMINDER_VALUE,
    };

    const result = createReminderDate(item);

    expect(result).toEqual(new Date(2026, 0, 6, 9, 0, 0, 0));
  });
});

describe("computeWeeklyTrigger", () => {
  it("keeps the same weekday when the offset does not cross midnight", () => {
    // 月曜9:00の30分前 → 月曜8:30
    expect(computeWeeklyTrigger(1, 9, 0, 30)).toEqual({ weekday: 2, hour: 8, minute: 30 });
  });

  it("rolls back to the previous day's weekday when the offset crosses midnight", () => {
    // 月曜0:30の1時間前 → 日曜23:30
    expect(computeWeeklyTrigger(1, 0, 30, 60)).toEqual({ weekday: 1, hour: 23, minute: 30 });
  });

  it("rolls back a full day for a 1-day-before offset", () => {
    // 月曜9:00の1日前 → 日曜9:00
    expect(computeWeeklyTrigger(1, 9, 0, 1440)).toEqual({ weekday: 1, hour: 9, minute: 0 });
  });

  it("returns to the same weekday for a 1-week-before offset", () => {
    // 月曜9:00の1週間前 → 曜日としては変わらず月曜9:00
    expect(computeWeeklyTrigger(1, 9, 0, 10080)).toEqual({ weekday: 2, hour: 9, minute: 0 });
  });

  it("applies no shift for a 0-minute offset (開始時間)", () => {
    expect(computeWeeklyTrigger(6, 14, 15, 0)).toEqual({ weekday: 7, hour: 14, minute: 15 });
  });

  it("rolls Sunday back into Saturday when crossing midnight", () => {
    // 日曜0:00の5分前 → 土曜23:55
    expect(computeWeeklyTrigger(0, 0, 0, 5)).toEqual({ weekday: 7, hour: 23, minute: 55 });
  });
});
