import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Calendar from "expo-calendar";
import { DEFAULT_PRIORITY, type SavedItem } from "@milkbox/shared";
import {
  createCalendarEventDrafts,
  DEVICE_CALENDAR_PROVIDER,
  setCalendarSyncSettings,
  syncTaskCalendarAsync,
  type CalendarLinkStore,
  type CalendarSyncProvider,
} from "../../src/services/calendarSync";

jest.mock("expo-calendar", () => ({
  Frequency: { DAILY: "daily", WEEKLY: "weekly", MONTHLY: "monthly", YEARLY: "yearly" },
  EntityTypes: { EVENT: "event" },
  getCalendarPermissionsAsync: jest.fn(),
}));

const baseItem: SavedItem = {
  id: 7,
  text: "牛乳を買う",
  date: "2026-09-21",
  startDate: "2026-09-21T10:00:00",
  endDate: "2026-09-21T11:30:00",
  color: "#fff",
  notificationEnabled: false,
  notificationMinutesBefore: 30,
  priority: DEFAULT_PRIORITY,
};

describe("calendar event mapping", () => {
  it("maps a one-time task and includes its category in the title", () => {
    const [draft] = createCalendarEventDrafts({ ...baseItem, categoryName: "買い物" });
    expect(draft).toMatchObject({
      title: "買い物｜牛乳を買う",
      allDay: false,
    });
    expect(draft.recurrenceRule).toBeUndefined();
    expect(draft.endDate.getTime() - draft.startDate.getTime()).toBe(90 * 60 * 1000);
  });

  it("creates one weekly series per weekday for Android-compatible recurrence", () => {
    const drafts = createCalendarEventDrafts({ ...baseItem, weekdays: "[1,3,5]" });
    expect(drafts).toHaveLength(3);
    expect(drafts.map((draft) => draft.startDate.getDay())).toEqual([1, 3, 5]);
    expect(drafts.every((draft) => draft.recurrenceRule?.frequency === "weekly")).toBe(true);
  });

  // 実際に起きた不具合: item.startDateが無い曜日繰り返しタスクは、作成時刻が
  // 埋まっているだけのitem.dateへフォールバックしていたため、タスクを登録した
  // 瞬間の時刻がそのままイベント時刻になってしまっていた。通知サービス
  // (REMINDER_HOUR=9時)と同じ基準時刻を使うのが正しい。
  it("defaults weekday-recurring tasks with no start time to 9am, not item.date's creation timestamp", () => {
    const [draft] = createCalendarEventDrafts({
      ...baseItem,
      startDate: undefined,
      endDate: undefined,
      date: "2026-09-21T23:45:00.000Z",
      weekdays: "[1]",
    });
    expect(draft.startDate.getHours()).toBe(9);
    expect(draft.startDate.getMinutes()).toBe(0);
  });

  describe("non-weekday recurrence", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 8, 22)); // 2026-09-22
    });
    afterEach(() => jest.useRealTimers());

    it("anchors a biweekly draft on the next matching occurrence with a WEEKLY/interval:2 rule", () => {
      const [draft] = createCalendarEventDrafts({
        ...baseItem, startDate: "2026-09-08T10:00:00", endDate: undefined, recurrence: { type: "biweekly" },
      });
      expect(draft.startDate).toEqual(new Date(2026, 8, 22, 10, 0));
      expect(draft.recurrenceRule).toEqual({ frequency: "weekly", interval: 2 });
    });

    it("builds a MONTHLY/interval:1 rule anchored on the next day-of-month occurrence", () => {
      // 起点は8/5、現在時刻は9/22に固定しているため、直近の発生日は9/5(既に過ぎている)
      // ではなく10/5になる。
      const [draft] = createCalendarEventDrafts({
        ...baseItem, startDate: "2026-08-05T08:00:00", endDate: undefined, recurrence: { type: "monthly" },
      });
      expect(draft.startDate).toEqual(new Date(2026, 9, 5, 8, 0));
      expect(draft.recurrenceRule).toEqual({ frequency: "monthly", interval: 1, daysOfTheMonth: [5] });
    });

    it("uses the original anchor day (not the clamped next occurrence) for daysOfTheMonth", () => {
      // 起点は1/31。現在時刻9/22基準の直近発生日はoccursOnDate()の月末クランプにより
      // 9/30になるが、daysOfTheMonthはoccurrenceの30ではなく基準日31から組み立てる
      // (でなければ再同期のたびに基準が30側へズレていく)。
      const [draft] = createCalendarEventDrafts({
        ...baseItem, startDate: "2026-01-31T08:00:00", endDate: undefined, recurrence: { type: "monthly" },
      });
      expect(draft.startDate).toEqual(new Date(2026, 8, 30, 8, 0));
      // 31日は常に月内最大の日なので、月末(-1)として表せば「31日、無ければ月末」を
      // 単一の値で表現でき、31日が存在する月でも重複発生しない。
      expect(draft.recurrenceRule).toEqual({ frequency: "monthly", interval: 1, daysOfTheMonth: [-1] });
    });

    it("keeps a non-31 anchor day (e.g. 30) as a literal daysOfTheMonth value", () => {
      const [draft] = createCalendarEventDrafts({
        ...baseItem, startDate: "2026-04-30T08:00:00", endDate: undefined, recurrence: { type: "monthly" },
      });
      expect(draft.recurrenceRule).toEqual({ frequency: "monthly", interval: 1, daysOfTheMonth: [30] });
    });

    it("builds a DAILY/interval:N rule for everyNDays", () => {
      const [draft] = createCalendarEventDrafts({
        ...baseItem, startDate: "2026-09-20T07:00:00", endDate: undefined, recurrence: { type: "everyNDays", days: 4 },
      });
      expect(draft.startDate).toEqual(new Date(2026, 8, 24, 7, 0));
      expect(draft.recurrenceRule).toEqual({ frequency: "daily", interval: 4 });
    });

    it("returns no drafts when there is no anchor startDate to compute an occurrence from", () => {
      expect(createCalendarEventDrafts({ ...baseItem, startDate: undefined, recurrence: { type: "monthly" } }))
        .toEqual([]);
    });
  });
});

describe("calendar sync orchestration", () => {
  let link: { itemId: number; provider: string; externalEventId: string } | null;
  let store: CalendarLinkStore;
  let provider: CalendarSyncProvider;

  beforeEach(async () => {
    await AsyncStorage.clear();
    link = null;
    store = {
      findCalendarLink: jest.fn(async () => link),
      findAllCalendarLinks: jest.fn(async () => link ? [link] : []),
      saveCalendarLink: jest.fn(async (next) => { link = next; }),
      deleteCalendarLink: jest.fn(async () => { link = null; }),
    };
    provider = {
      id: DEVICE_CALENDAR_PROVIDER,
      createEvent: jest.fn(async () => "new-event"),
      updateEvent: jest.fn(async () => "updated-event"),
      deleteEvent: jest.fn(async () => undefined),
    };
    jest.mocked(Calendar.getCalendarPermissionsAsync).mockResolvedValue({ granted: true } as never);
    await setCalendarSyncSettings({ enabled: true, calendarId: "calendar-1" });
  });

  it("creates and persists a provider link on first sync", async () => {
    await syncTaskCalendarAsync(baseItem, store, provider);
    expect(provider.createEvent).toHaveBeenCalledWith("calendar-1", baseItem);
    expect(link).toEqual({ itemId: 7, provider: "device", externalEventId: "new-event" });
  });

  it("updates through the provider when a link already exists", async () => {
    link = { itemId: 7, provider: "device", externalEventId: "old-event" };
    await syncTaskCalendarAsync(baseItem, store, provider);
    expect(provider.updateEvent).toHaveBeenCalledWith("old-event", "calendar-1", baseItem);
    expect(provider.createEvent).not.toHaveBeenCalled();
  });

  it("does nothing when sync is disabled", async () => {
    await setCalendarSyncSettings({ enabled: false, calendarId: "calendar-1" });
    await syncTaskCalendarAsync(baseItem, store, provider);
    expect(provider.createEvent).not.toHaveBeenCalled();
  });
});
