import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Calendar from "expo-calendar";
import type { SavedItem } from "@milkbox/shared";
import { parseWeekdays } from "../utils/weekdays";
import { findNextOccurrence } from "../utils/recurrence";
import { parseItemDate as parseAnchorDate } from "../utils/calendarDates";
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

// 毎月タスクのdaysOfTheMonthを、基準日(1〜31)から組み立てる。
// 月によっては基準日が存在しない(2月31日等)ため、expo-calendarのdaysOfTheMonthを
// そのまま基準日1つだけにすると、その月は発生自体がスキップされてしまう
// (occursOnDate()が行っている「月末へクランプ」とズレる)。
// 31日だけは常に月内最大の日なので、代わりに-1(月末)を指定すれば
// 「31日、無ければ月末」を単一の値で正確に表現できる(31日が存在する月では
// -1も同じ日を指すため重複発生しない)。29・30日はこの単一値変換ができない
// (BYSETPOS相当の機能がこのAPIのmonthly頻度には無いため、複数値を渡すと
// 該当月に重複して発生してしまう)ので、基準日そのままとし、2月だけ発生しない
// 既知の制約として許容する。
function buildMonthlyDaysOfTheMonth(anchorDay: number): number[] {
  return anchorDay === 31 ? [-1] : [anchorDay];
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

  if (item.recurrence) {
    // 隔週/毎月/N日ごとも、実際の発生時刻はitem.dateではなくitem.startDate/endDateに
    // 含まれる時刻を基準にする(曜日繰り返しと同じ前提)。開始日はfindNextOccurrence()で
    // 求めた直近の発生日を使い、そこからの繰り返しは端末カレンダー側のRRULEに委ねる。
    const occurrence = findNextOccurrence(item, new Date());
    if (!occurrence) return [];

    const startTime = resolveTimeOfDay(item.startDate) ?? { hour: DEFAULT_EVENT_HOUR, minute: 0 };
    const endTime = resolveTimeOfDay(item.endDate);
    const startMinutes = startTime.hour * 60 + startTime.minute;
    const endMinutes = endTime ? endTime.hour * 60 + endTime.minute : null;
    const durationMinutes = endMinutes !== null && endMinutes > startMinutes ? endMinutes - startMinutes : 60;
    const startDate = new Date(
      occurrence.getFullYear(), occurrence.getMonth(), occurrence.getDate(), startTime.hour, startTime.minute,
    );

    const recurrenceRule: Calendar.RecurrenceRule = item.recurrence.type === "biweekly"
      ? { frequency: Calendar.Frequency.WEEKLY, interval: 2 }
      : item.recurrence.type === "monthly"
        ? {
            frequency: Calendar.Frequency.MONTHLY,
            interval: 1,
            // occurrence(直近の発生日)ではなく、元の基準日(item.startDate)の日付を
            // 使う。occurrenceは月末クランプ済みのことがあり、それをそのまま
            // daysOfTheMonthに使うと同期のたびに基準がズレていく
            // (例: 2月28日に同期すると、以後ずっと28日が基準になってしまう)。
            // daysOfTheMonthはexpo-calendar上iOS限定。Androidはこのフィールドを
            // 無視し、イベント自体のstartDate(=occurrence、直近の発生日)を基準に
            // 繰り返すため、月末クランプ後の日で同期したタイミング次第では
            // Android側だけ基準がズレたままになり得る(次回の再同期で復帰する)。
            daysOfTheMonth: buildMonthlyDaysOfTheMonth((parseAnchorDate(item.startDate) ?? occurrence).getDate()),
          }
        : { frequency: Calendar.Frequency.DAILY, interval: item.recurrence.days };

    return [{
      title,
      allDay: false,
      notes,
      startDate,
      endDate: new Date(startDate.getTime() + durationMinutes * 60 * 1000),
      recurrenceRule,
    }];
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
