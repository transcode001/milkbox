import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Calendar from "expo-calendar";
import type { SavedItem } from "@milkbox/shared";
import {
  createCalendarEventDrafts,
  DEVICE_CALENDAR_PROVIDER,
  setCalendarSyncSettings,
  syncTaskCalendarAsync,
  type CalendarLinkStore,
  type CalendarSyncProvider,
} from "../../src/services/calendarSync";

jest.mock("expo-calendar", () => ({
  Frequency: { WEEKLY: "weekly" },
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
