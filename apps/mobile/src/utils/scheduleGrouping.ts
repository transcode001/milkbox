// 選択日の予定リスト(CalendarScreen下部)を「表示用にどう並べる・束ねる・
// 色付けするか」を扱うユーティリティ。日付そのものの計算は calendarDates.ts
// に委譲し、ここでは SavedItem を前提にしたロジックだけを持つ。
import type { SavedItem } from "@milkbox/shared";
import { parseItemDate, parsePointDate } from "./calendarDates";
import { parseWeekdays } from "./weekdays";

// 表示色はカテゴリの色(categoryColor)を優先し、カテゴリ未設定のタスクだけ
// タスク自身のcolor(AddTaskScreenのColorPickerで選択された値、常に非空)を使う。
// 以前はカテゴリ名のハッシュから固定パレット(BAR_PALETTE)を割り当てていたが、
// item.colorが常に埋まる仕様になったことで`??`によるフォールバックが機能しなくなり、
// カテゴリごとの色分けが事実上死んでいた。カテゴリ自体が色を持つようになった今は
// そのcategoryColorを直接使うのが正しい。
export function resolveDisplayColor(item: SavedItem): string {
  return item.categoryColor ?? item.color;
}

export function formatTimeOfDay(value?: string): string | null {
  if (!value || !value.includes("T")) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatScheduleTime(item: SavedItem): string {
  const start = formatTimeOfDay(item.startDate);
  const end = formatTimeOfDay(item.endDate);
  if (start && end) return `${start} 〜 ${end}`;
  if (start) return start;
  if (end) return `〜 ${end}`;
  // 曜日繰り返しタスクの date は作成時刻が入るため時間表示には使わない
  if (parseWeekdays(item.weekdays).length > 0) return "終日";
  return formatTimeOfDay(item.date) ?? "終日";
}

export function isMultiDayRange(item: SavedItem): boolean {
  if (!item.startDate || !item.endDate) return false;
  const s = parseItemDate(item.startDate);
  const e = parseItemDate(item.endDate);
  if (!s || !e) return false;
  return s.getTime() !== e.getTime();
}

export type ScheduleCategoryGroup = {
  key: string;
  categoryName: string;
  items: SavedItem[];
};

export const UNCATEGORIZED_KEY = "__uncategorized__";
export const UNCATEGORIZED_LABEL = "カテゴリ指定なし";

const getScheduleTimeValue = (item: SavedItem): number => {
  // 曜日繰り返しタスクのdateは実際の発生時刻ではなく作成時刻(formatScheduleTime
  // 参照)なので、それをソートキーに使うと無関係な時刻順になってしまう。
  // 終日イベント扱いとして常に先頭に来るよう -Infinity を返す。
  if (parseWeekdays(item.weekdays).length > 0) return -Infinity;
  return parsePointDate(item.startDate ?? item.endDate ?? item.date)?.getTime() ?? 0;
};

export function sortScheduleItemsByTime(items: SavedItem[]): SavedItem[] {
  return [...items].sort((left, right) => getScheduleTimeValue(left) - getScheduleTimeValue(right));
}

export function groupScheduleItems(items: SavedItem[]): ScheduleCategoryGroup[] {
  const groups = new Map<string, ScheduleCategoryGroup>();

  for (const item of sortScheduleItemsByTime(items)) {
    const key = item.categoryId != null ? String(item.categoryId) : UNCATEGORIZED_KEY;
    const existing = groups.get(key);

    if (existing) {
      existing.items.push(item);
      continue;
    }

    groups.set(key, {
      key,
      categoryName: item.categoryId != null
        ? (item.categoryName ?? "")
        : UNCATEGORIZED_LABEL,
      items: [item],
    });
  }

  return Array.from(groups.values());
}
