import { SavedItem } from "@milkbox/shared/repositories/types";

export interface CategorySection {
  title: string;
  data: SavedItem[];
}

const UNCATEGORIZED_LABEL = "期間指定なし";

export const groupByCategory = (items: SavedItem[]): CategorySection[] => {
  const sections = new Map<string, SavedItem[]>();

  for (const item of items) {
    const categoryName = item.categoryName || UNCATEGORIZED_LABEL;
    const existing = sections.get(categoryName);

    if (existing) {
      existing.push(item);
      continue;
    }

    sections.set(categoryName, [item]);
  }

  return Array.from(sections, ([title, data]) => ({ title, data }));
};
