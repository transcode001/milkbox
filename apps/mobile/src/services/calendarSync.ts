import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Calendar from "expo-calendar";
import type { SavedItem } from "@milkbox/shared";
import { parseWeekdays } from "../utils/weekdays";
import type { ItemCalendarLink } from "../repositories/sqlite/ItemRepository";

export const DEVICE_CALENDAR_PROVIDER = "device";
const CALENDAR_SYNC_SETTINGS_KEY = "@milkbox_calendar_sync_settings";
const DEFAULT_EVENT_HOUR = 9;

export interface CalendarSyncSettings {
  enabled: boolean;
  calendarId: string | null;
}

export interface CalendarLinkStore {
  findCalendarLink(itemId: number, provider: string): Promise<ItemCalendarLink | null>;
  findAllCalendarLinks(provider?: string): Promise<ItemCalendarLink[]>;
  saveCalendarLink(link: ItemCalendarLink): Promise<void>;
  deleteCalendarLink(itemId: number, provider: string): Promise<void>;
}

export interface CalendarSyncProvider {
  readonly id: string;
  createEvent(calendarId: string, item: SavedItem): Promise<string>;
  updateEvent(externalEventId: string, calendarId: string, item: SavedItem): Promise<string>;
  deleteEvent(externalEventId: string): Promise<void>;
}

export type CalendarEventDraft = {
  title: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  notes: string;
  recurrenceRule?: Calendar.RecurrenceRule;
};

function parseItemDate(value: string | undefined, fallback: string): { date: Date; allDay: boolean } {
  const source = value ?? fallback;
  const allDay = !source.includes("T") && !source.includes(" ");
  if (allDay) {
    const [year, month, day] = source.split("-").map(Number);
    return { date: new Date(year, month - 1, day, DEFAULT_EVENT_HOUR), allDay };
  }
  return { date: new Date(source), allDay };
}

function nextDateForWeekday(date: Date, weekday: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + ((weekday - result.getDay() + 7) % 7));
  return result;
}

// item.startDate/endDateに時刻が含まれていればその時:分を返す。含まれていなければnull。
function resolveTimeOfDay(value: string | undefined): { hour: number; minute: number } | null {
  if (!value || (!value.includes("T") && !value.includes(" "))) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return { hour: date.getHours(), minute: date.getMinutes() };
}

export function createCalendarEventDrafts(item: SavedItem): CalendarEventDraft[] {
  const title = item.categoryName ? `${item.categoryName}｜${item.text}` : item.text;
  const notes = `Milkboxのタスク（ID: ${item.id}）`;
  const weekdays = parseWeekdays(item.weekdays);

  if (weekdays.length > 0) {
    // item.dateは曜日繰り返しタスクの実際の発生時刻ではなく作成時刻でしかない
    // (utils/scheduleGrouping.tsのgetScheduleTimeValueと同じ前提)ため、
    // ここでは時刻の算出に使わない。開始時刻はitem.startDateに時刻が含まれて
    // いればそれを、無ければ通知サービス(REMINDER_HOUR)と同じ
    // DEFAULT_EVENT_HOURを基準にする。
    const startTime = resolveTimeOfDay(item.startDate) ?? { hour: DEFAULT_EVENT_HOUR, minute: 0 };
    const endTime = resolveTimeOfDay(item.endDate);
    const startMinutes = startTime.hour * 60 + startTime.minute;
    const endMinutes = endTime ? endTime.hour * 60 + endTime.minute : null;
    const durationMinutes = endMinutes !== null && endMinutes > startMinutes ? endMinutes - startMinutes : 60;

    return weekdays.map((weekday) => {
      const anchor = nextDateForWeekday(new Date(), weekday);
      const startDate = new Date(
        anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), startTime.hour, startTime.minute,
      );
      return {
        title,
        allDay: false,
        notes,
        startDate,
        endDate: new Date(startDate.getTime() + durationMinutes * 60 * 1000),
        recurrenceRule: { frequency: Calendar.Frequency.WEEKLY, interval: 1 },
      };
    });
  }

  const parsedStart = parseItemDate(item.startDate, item.date);
  if (Number.isNaN(parsedStart.date.getTime())) return [];

  const parsedEnd = item.endDate ? parseItemDate(item.endDate, item.date) : null;
  const defaultDuration = parsedStart.allDay ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
  const requestedDuration = parsedEnd && !Number.isNaN(parsedEnd.date.getTime())
    ? parsedEnd.date.getTime() - parsedStart.date.getTime()
    : defaultDuration;
  const duration = requestedDuration > 0 ? requestedDuration : defaultDuration;
  const startDate = parsedStart.date;
  return [{
    title,
    allDay: parsedStart.allDay,
    notes,
    startDate,
    endDate: new Date(startDate.getTime() + duration),
  }];
}

function encodeEventIds(ids: string[]): string {
  return JSON.stringify(ids);
}

function decodeEventIds(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((id) => typeof id === "string")
      ? parsed
      : [value];
  } catch {
    return [value];
  }
}

export const deviceCalendarProvider: CalendarSyncProvider = {
  id: DEVICE_CALENDAR_PROVIDER,
  async createEvent(calendarId, item) {
    const createdIds: string[] = [];
    try {
      for (const draft of createCalendarEventDrafts(item)) {
        createdIds.push(await Calendar.createEventAsync(calendarId, draft));
      }
      return encodeEventIds(createdIds);
    } catch (error) {
      await Promise.allSettled(createdIds.map((id) => Calendar.deleteEventAsync(id)));
      throw error;
    }
  },
  async updateEvent(externalEventId, calendarId, item) {
    const replacementId = await this.createEvent(calendarId, item);
    try {
      await this.deleteEvent(externalEventId);
      return replacementId;
    } catch (error) {
      await this.deleteEvent(replacementId).catch(() => undefined);
      throw error;
    }
  },
  async deleteEvent(externalEventId) {
    const results = await Promise.allSettled(
      decodeEventIds(externalEventId).map((id) => Calendar.deleteEventAsync(id)),
    );
    const failed = results.find((result) => result.status === "rejected");
    if (failed?.status === "rejected") throw failed.reason;
  },
};

export async function getCalendarSyncSettings(): Promise<CalendarSyncSettings> {
  const stored = await AsyncStorage.getItem(CALENDAR_SYNC_SETTINGS_KEY);
  if (!stored) return { enabled: false, calendarId: null };
  try {
    const parsed = JSON.parse(stored) as Partial<CalendarSyncSettings>;
    return {
      enabled: parsed.enabled === true,
      calendarId: typeof parsed.calendarId === "string" ? parsed.calendarId : null,
    };
  } catch {
    return { enabled: false, calendarId: null };
  }
}

export async function setCalendarSyncSettings(settings: CalendarSyncSettings): Promise<void> {
  await AsyncStorage.setItem(CALENDAR_SYNC_SETTINGS_KEY, JSON.stringify(settings));
}

export async function getWritableCalendarsAsync(): Promise<Calendar.Calendar[]> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return calendars.filter((calendar) => calendar.allowsModifications);
}

export async function hasCalendarPermissionAsync(): Promise<boolean> {
  return (await Calendar.getCalendarPermissionsAsync()).granted;
}

export async function requestCalendarPermissionAsync(): Promise<boolean> {
  // SDK 54 / expo-calendar 15 exposes full calendar access only. Full access is
  // also required to list calendars and to update/delete previously synced events.
  return (await Calendar.requestCalendarPermissionsAsync()).granted;
}

export async function syncTaskCalendarAsync(
  item: SavedItem,
  links: CalendarLinkStore,
  provider: CalendarSyncProvider = deviceCalendarProvider,
): Promise<void> {
  const settings = await getCalendarSyncSettings();
  const existing = await links.findCalendarLink(item.id, provider.id);
  if (!settings.enabled || !settings.calendarId || !(await hasCalendarPermissionAsync())) {
    return;
  }

  const externalEventId = existing
    ? await provider.updateEvent(existing.externalEventId, settings.calendarId, item)
    : await provider.createEvent(settings.calendarId, item);
  await links.saveCalendarLink({ itemId: item.id, provider: provider.id, externalEventId });
}

// 戻り値は端末側のイベント削除に成功したかどうか。呼び出し元がミラーのDBレコードを
// 消してよいかの判断に使う(タスク自体を削除する経路ではitemが無くなる以上どのみち
// リンク行も一緒に消えるため戻り値は無視してよいが、同期の無効化のように「削除が
// 確認できたリンクだけ消す」場合はここを見て判断する)。
export async function deleteTaskCalendarEventAsync(
  itemId: number,
  links: CalendarLinkStore,
  provider: CalendarSyncProvider = deviceCalendarProvider,
): Promise<boolean> {
  const existing = await links.findCalendarLink(itemId, provider.id);
  if (!existing) return true;
  try {
    await provider.deleteEvent(existing.externalEventId);
    return true;
  } catch (error) {
    console.warn(`Failed to delete calendar event for item ${itemId}`, error);
    return false;
  }
}

export async function deleteAllTaskCalendarEventsAsync(
  links: CalendarLinkStore,
  provider: CalendarSyncProvider = deviceCalendarProvider,
): Promise<void> {
  const existingLinks = await links.findAllCalendarLinks(provider.id);
  for (const link of existingLinks) {
    // 端末側の削除が確認できたリンクだけDBから消す。失敗したリンクを消してしまうと、
    // milkbox側は追跡情報を失うのに端末上にはイベントが残り続け、二度と削除できない
    // 孤児イベントになってしまう。
    const deleted = await deleteTaskCalendarEventAsync(link.itemId, links, provider);
    if (!deleted) continue;
    await links.deleteCalendarLink(link.itemId, provider.id);
  }
}
