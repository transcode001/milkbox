import type { Recurrence, SavedItem } from "@milkbox/shared";
import { parseItemDate, startOfDay } from "./calendarDates";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// item.startDateの日付部分を起点として扱う。起点が無い繰り返し設定は
// (UIでは起こらない想定だが)安全側に倒して「発生しない」とする。
export function occursOnDate(item: Pick<SavedItem, "startDate" | "recurrence">, date: Date): boolean {
  const recurrence = item.recurrence;
  if (!recurrence) return false;

  const anchor = parseItemDate(item.startDate);
  if (!anchor) return false;

  const target = startOfDay(date);
  const diff = daysBetween(anchor, target);
  if (diff < 0) return false;

  switch (recurrence.type) {
    case "biweekly":
      return diff % 14 === 0;
    case "monthly": {
      const anchorDay = Math.min(anchor.getDate(), daysInMonth(target.getFullYear(), target.getMonth()));
      return target.getDate() === anchorDay;
    }
    case "everyNDays":
      return diff % recurrence.days === 0;
    default:
      return false;
  }
}

// カレンダー同期・通知のスケジューリングで使う、基準日以降で最初に発生する日付。
// 探索の打ち切り上限はeveryNDaysならその日数+31日、それ以外(隔週・毎月)は400日
// (うるう年をまたぐ月次パターンでも1回転は必ず見つかる長さ)にする。
export function findNextOccurrence(
  item: Pick<SavedItem, "startDate" | "recurrence">,
  from: Date,
): Date | null {
  if (!item.recurrence) return null;
  const anchor = parseItemDate(item.startDate);
  if (!anchor) return null;

  const searchLimitDays = item.recurrence.type === "everyNDays"
    ? Math.max(item.recurrence.days, 31) + 1
    : 400;

  // fromが開始日より前(例: 「2か月後からN日ごと」を今日作成した場合)だと、
  // fromから数えた探索上限に開始日が収まらず見つからないまま打ち切られてしまう。
  // 「検索指定日」と「開始日」の遅い方から探索を始める。
  const fromDay = startOfDay(from);
  const start = fromDay.getTime() > anchor.getTime() ? fromDay : anchor;
  for (let offset = 0; offset <= searchLimitDays; offset++) {
    const candidate = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
    if (occursOnDate(item, candidate)) return candidate;
  }
  return null;
}

// HomeScreenの一覧行・編集モーダルで使う短い表示ラベル。
export function formatRecurrenceLabel(recurrence: Recurrence): string {
  switch (recurrence.type) {
    case "biweekly":
      return "隔週";
    case "monthly":
      return "毎月";
    case "everyNDays":
      return `${recurrence.days}日ごと`;
  }
}
