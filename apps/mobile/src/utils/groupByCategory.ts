import { SavedItem } from "@milkbox/shared/repositories/types";

export interface CategorySection {
  title: string;
  data: SavedItem[];
}

const UNCATEGORIZED_LABEL = "タスク指定なし";
const UNCATEGORIZED_KEY = "__uncategorized__";

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
