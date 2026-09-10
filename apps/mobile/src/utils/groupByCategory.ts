import { SavedItem } from "@milkbox/shared/repositories/types";
// CalendarScreen側の集計(utils/scheduleGrouping.ts)と表記を必ず一致させるため、
// ここで独自に定義せず同じ定数を再利用する。
import { UNCATEGORIZED_KEY, UNCATEGORIZED_LABEL } from "./scheduleGrouping";

export interface CategorySection {
  title: string;
  data: SavedItem[];
}

export const groupByCategory = (items: SavedItem[]): CategorySection[] => {
  const sections = new Map<string, SavedItem[]>();

  for (const item of items) {
    const key = item.categoryId != null ? String(item.categoryId) : UNCATEGORIZED_KEY;
    const existing = sections.get(key);

    if (existing) {
      existing.push(item);
      continue;
    }

    sections.set(key, [item]);
  }

  return Array.from(sections.values()).map((data) => ({
    title:
      data[0].categoryId != null
        ? (data[0].categoryName ?? "")
        : UNCATEGORIZED_LABEL,
    data,
  }));
};
