import type { Category, Priority, SavedItem } from "@milkbox/shared";
import { getDayEvents } from "./weekTimeline";
import { createDateKey } from "./calendarDates";
import { WEEKDAY_LABELS } from "./weekdays";

export function countCategoryOccurrences(items: SavedItem[], categories: Category[], dates?: Date[]) {
  // 繰り返し・複数日タスクは、対象期間の発生日ごとに1件と数える。
  const occurrences = dates ? dates.flatMap(date => {
    const events = getDayEvents(items, date);
    return [...events.allDay, ...events.timed.map(event => event.item)];
  }) : items;
  const counts = new Map<number | undefined, number>();
  for (const item of occurrences) {
    const key = item.categoryId ?? undefined;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts, ([id, count]) => ({
    key: id ?? "uncategorized",
    category: categories.find(category => category.id === id),
    count,
  }));
}

export interface GroupStat<K> {
  key: K;
  scheduled: number;
  completed: number;
}

export interface CategoryStat extends GroupStat<number | "uncategorized"> {
  category?: Category;
}

export interface DailyStat {
  date: Date;
  scheduled: number;
  completed: number;
}

export interface StatsSummary {
  scheduled: number;
  completed: number;
  byCategory: CategoryStat[];
  byPriority: GroupStat<Priority>[];
  byDay: DailyStat[];
}

// 統計/振り返りビューで使う集計。対象期間の各日についてgetDayEvents()で
// 「その日に発生するタスク」を数え上げ(繰り返し・複数日タスクも発生日ごとに
// 1件と数える点はcountCategoryOccurrences()と同じ)、その中で完了記録がある
// ものをcompletedとしてカテゴリ・優先度・日付ごとに集計する。
export function computeStatsSummary(
  items: SavedItem[],
  categories: Category[],
  dates: Date[],
  completedIdsByDate: Map<string, Set<number>>,
): StatsSummary {
  const byCategory = new Map<number | "uncategorized", CategoryStat>();
  const byPriority = new Map<Priority, GroupStat<Priority>>();
  const byDay: DailyStat[] = [];

  for (const date of dates) {
    const completedIds = completedIdsByDate.get(createDateKey(date)) ?? new Set<number>();
    const events = getDayEvents(items, date);
    const dueItems = [...events.allDay, ...events.timed.map((event) => event.item)];

    let dayScheduled = 0;
    let dayCompleted = 0;

    for (const item of dueItems) {
      const isDone = completedIds.has(item.id);
      dayScheduled += 1;
      if (isDone) dayCompleted += 1;

      const categoryKey = item.categoryId ?? "uncategorized";
      const categoryStat = byCategory.get(categoryKey) ?? {
        key: categoryKey,
        category: categories.find((category) => category.id === item.categoryId),
        scheduled: 0,
        completed: 0,
      };
      categoryStat.scheduled += 1;
      if (isDone) categoryStat.completed += 1;
      byCategory.set(categoryKey, categoryStat);

      const priorityStat = byPriority.get(item.priority) ?? {
        key: item.priority,
        scheduled: 0,
        completed: 0,
      };
      priorityStat.scheduled += 1;
      if (isDone) priorityStat.completed += 1;
      byPriority.set(item.priority, priorityStat);
    }

    byDay.push({ date, scheduled: dayScheduled, completed: dayCompleted });
  }

  return {
    scheduled: byDay.reduce((sum, day) => sum + day.scheduled, 0),
    completed: byDay.reduce((sum, day) => sum + day.completed, 0),
    byCategory: Array.from(byCategory.values()),
    byPriority: Array.from(byPriority.values()),
    byDay,
  };
}

export interface ChartBar {
  key: string;
  label: string;
  scheduled: number;
  completed: number;
}

// 週表示用: 1日1本のまま、曜日ラベルを付けるだけ。
export function toWeekChartBars(byDay: DailyStat[]): ChartBar[] {
  return byDay.map((day) => ({
    key: createDateKey(day.date),
    label: WEEKDAY_LABELS[day.date.getDay()],
    scheduled: day.scheduled,
    completed: day.completed,
  }));
}

// 月表示用: 日次のbyDayを「その月の何週目か」(月をまたがず、月内の日付だけで
// 週番号を振る)で束ねてグラフの棒に潰す。
export function groupDailyStatsByWeekOfMonth(byDay: DailyStat[]): ChartBar[] {
  const buckets = new Map<number, { scheduled: number; completed: number }>();

  for (const day of byDay) {
    const firstOfMonth = new Date(day.date.getFullYear(), day.date.getMonth(), 1);
    const weekIndex = Math.floor((day.date.getDate() - 1 + firstOfMonth.getDay()) / 7);
    const bucket = buckets.get(weekIndex) ?? { scheduled: 0, completed: 0 };
    bucket.scheduled += day.scheduled;
    bucket.completed += day.completed;
    buckets.set(weekIndex, bucket);
  }

  return Array.from(buckets.entries())
    .sort(([left], [right]) => left - right)
    .map(([weekIndex, stat]) => ({
      key: `week-${weekIndex}`,
      label: `${weekIndex + 1}週`,
      ...stat,
    }));
}

// 年表示用: 日次のbyDayを月ごとに束ねてグラフの棒に潰す。
export function groupDailyStatsByMonth(byDay: DailyStat[]): ChartBar[] {
  const buckets = new Map<number, { scheduled: number; completed: number }>();

  for (const day of byDay) {
    const month = day.date.getMonth();
    const bucket = buckets.get(month) ?? { scheduled: 0, completed: 0 };
    bucket.scheduled += day.scheduled;
    bucket.completed += day.completed;
    buckets.set(month, bucket);
  }

  return Array.from(buckets.entries())
    .sort(([left], [right]) => left - right)
    .map(([month, stat]) => ({
      key: `month-${month}`,
      label: `${month + 1}`,
      ...stat,
    }));
}
