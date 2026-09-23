import type { SavedItem } from "@milkbox/shared";
import { createDateKey, parseItemDate, parsePointDate } from "./calendarDates";
import { isMultiDayRange } from "./scheduleGrouping";
import { occursOnDate } from "./recurrence";
import { parseWeekdays } from "./weekdays";

export const HOUR_HEIGHT = 40;
export const MIN_EVENT_MINUTES = 45;

export type DayEvent = {
  item: SavedItem;
  startMinutes: number;
  endMinutes: number;
};
export type LaidOutDayEvent = DayEvent & { lane: number; laneCount: number };

const minutesOfDay = (value?: string): number | null => {
  // toDateKey(calendarDates.ts)と同様、"T"区切りのISO文字列だけでなく
  // スペース区切りの日時文字列(SQLiteのdatetime()等)も時刻ありとして扱う。
  if (!value || (!value.includes("T") && !value.includes(" "))) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getHours() * 60 + date.getMinutes();
};

// 複数日の範囲・時刻なしは上部の終日欄に表示する。開始のみは1時間、
// 終了のみは終了までの1時間を仮の表示枠にする（保存データは変更しない）。
export function getDayEvents(items: SavedItem[], day: Date): { timed: DayEvent[]; allDay: SavedItem[] } {
  const timed: DayEvent[] = [];
  const allDay: SavedItem[] = [];
  const key = createDateKey(day);
  for (const item of items) {
    const weekdays = parseWeekdays(item.weekdays);
    const recurring = Boolean(item.recurrence);
    if (weekdays.length > 0) {
      if (!weekdays.includes(day.getDay())) continue;
    } else if (recurring) {
      if (!occursOnDate(item, day)) continue;
    } else if (isMultiDayRange(item)) {
      const start = parseItemDate(item.startDate)!;
      const end = parseItemDate(item.endDate)!;
      const dayKey = createDateKey(day);
      if (dayKey >= createDateKey(start) && dayKey <= createDateKey(end)) allDay.push(item);
      continue;
    } else {
      const occurrence = parsePointDate(item.startDate ?? item.endDate ?? item.date);
      if (!occurrence || createDateKey(occurrence) !== key) continue;
    }

    let start = minutesOfDay(item.startDate);
    const end = minutesOfDay(item.endDate);
    // 曜日繰り返し・その他の繰り返しはitem.dateが実際の発生時刻ではなく作成時刻でしか
    // ないため、時刻ありのstartDate/endDateが無ければ終日扱いにする(item.dateへは
    // フォールバックしない)。
    if (start === null && end === null && weekdays.length === 0 && !recurring) {
      start = minutesOfDay(item.date);
    }
    if (start === null && end === null) {
      allDay.push(item);
      continue;
    }
    const startMinutes = start ?? Math.max(0, end! - 60);
    // 日をまたぐ繰り返し時刻は当日24時までの枠として扱う。
    const endMinutes = end !== null
      ? (end < startMinutes ? 1440 : end)
      : Math.min(1440, startMinutes + 60);
    timed.push({ item, startMinutes, endMinutes });
  }
  return { timed, allDay };
}

// 最低表示高さも重なり判定に含め、短い予定同士が描画上重ならないようにする。
// 重なりが連鎖するグループごとにレーン数を揃える。
export function layoutDayEvents(events: DayEvent[]): LaidOutDayEvent[] {
  const sorted = [...events].sort((a, b) => a.startMinutes - b.startMinutes || a.item.id - b.item.id);
  const result: LaidOutDayEvent[] = [];
  let group: LaidOutDayEvent[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -Infinity;
  const flush = () => {
    group.forEach((event) => { event.laneCount = laneEnds.length; });
    result.push(...group);
    group = [];
    laneEnds = [];
  };
  for (const event of sorted) {
    if (event.startMinutes >= groupEnd) flush();
    const end = Math.min(1440, Math.max(event.endMinutes, event.startMinutes + MIN_EVENT_MINUTES));
    let lane = laneEnds.findIndex((value) => value <= event.startMinutes);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = end;
    groupEnd = Math.max(...laneEnds);
    group.push({ ...event, lane, laneCount: 1 });
  }
  flush();
  return result;
}

// 週間表示の横スクロールや縦スクロールは日付移動として扱わない。
// 短いフリックでも最低20ptの横移動を要求して誤操作を避ける。
export function getDayRangeSwipeOffset(
  count: number, translationX: number, translationY: number, velocityX: number,
): -1 | 0 | 1 {
  if (count !== 1 && count !== 3) return 0;
  const distance = Math.abs(translationX);
  if (distance < 20 || distance <= Math.abs(translationY) * 1.5) return 0;
  if (distance < 60 && (Math.abs(velocityX) < 500 || Math.sign(velocityX) !== Math.sign(translationX))) return 0;
  return translationX < 0 ? 1 : -1;
}
