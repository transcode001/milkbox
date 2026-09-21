import type { SavedItem } from "@milkbox/shared";
import { countCategoryOccurrences } from "../../src/utils/completionStats";
import { buildWeek } from "../../src/utils/calendarDates";

const base: SavedItem = { id: 1, text: "予定", date: "2026-09-20", color: "#123456", notificationEnabled: false, notificationMinutesBefore: 30 };
const categories = [{ id: 1, name: "仕事", color: "#123456", icon: "briefcase-outline" }];
it("counts each recurring occurrence and includes single and multiday tasks", () => {
  const result = countCategoryOccurrences([
    { ...base, categoryId: 1, weekdays: "[1,3,5]" },
    { ...base, id: 2 },
    { ...base, id: 3, date: "2026-09-27" },
    { ...base, id: 4, categoryId: 1, startDate: "2026-09-19", endDate: "2026-09-21" },
  ], categories, buildWeek(new Date(2026, 8, 23)));
  expect(result.map(group => [group.key, group.count])).toEqual(expect.arrayContaining([[1, 5], ["uncategorized", 1]]));
  expect(result.find(group => group.key === 1)?.category?.icon).toBe("briefcase-outline");
});
it("groups a selected day's tasks into unique categories and handles an empty day", () => {
  expect(countCategoryOccurrences([{ ...base, categoryId: 1 }, { ...base, id: 2, categoryId: 1 }], categories)).toHaveLength(1);
  expect(countCategoryOccurrences([], categories)).toEqual([]);
});
