import type { Category, SavedItem } from "@milkbox/shared";
import { getDayEvents } from "./weekTimeline";

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
