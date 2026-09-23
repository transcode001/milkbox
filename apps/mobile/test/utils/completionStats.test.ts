import { DEFAULT_PRIORITY, type SavedItem } from "@milkbox/shared";
import {
  computeStatsSummary,
  countCategoryOccurrences,
  groupDailyStatsByMonth,
  groupDailyStatsByWeekOfMonth,
  toWeekChartBars,
  type DailyStat,
} from "../../src/utils/completionStats";
import { buildWeek, createDateKey } from "../../src/utils/calendarDates";

const base: SavedItem = { id: 1, text: "予定", date: "2026-09-20", color: "#123456", notificationEnabled: false, notificationMinutesBefore: 30, priority: DEFAULT_PRIORITY };
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

describe("computeStatsSummary", () => {
  const week = buildWeek(new Date(2026, 8, 23)); // Sun 2026-09-20 〜 Sat 2026-09-26
  const monday = week[1];
  const wednesday = week[3];

  it("tallies scheduled/completed totals, and breaks them down by category, priority, and day", () => {
    const items: SavedItem[] = [
      { ...base, id: 1, categoryId: 1, priority: "high", weekdays: "[1,3]" }, // Mon & Wed
      { ...base, id: 2, categoryId: undefined, priority: "low", date: createDateKey(monday) }, // Mon only, uncategorized
    ];
    const completedIdsByDate = new Map<string, Set<number>>([
      [createDateKey(monday), new Set([1, 2])],
      [createDateKey(wednesday), new Set()],
    ]);

    const summary = computeStatsSummary(items, categories, week, completedIdsByDate);

    // item1: Mon+Wed(2 occurrences), item2: Mon only(1 occurrence) = 3 scheduled total
    expect(summary.scheduled).toBe(3);
    // completed on Monday only: item1(Mon) + item2(Mon) = 2
    expect(summary.completed).toBe(2);

    const categoryStat = summary.byCategory.find((stat) => stat.key === 1);
    expect(categoryStat).toMatchObject({ scheduled: 2, completed: 1 });
    const uncategorizedStat = summary.byCategory.find((stat) => stat.key === "uncategorized");
    expect(uncategorizedStat).toMatchObject({ scheduled: 1, completed: 1 });

    const highPriorityStat = summary.byPriority.find((stat) => stat.key === "high");
    expect(highPriorityStat).toMatchObject({ scheduled: 2, completed: 1 });
    const lowPriorityStat = summary.byPriority.find((stat) => stat.key === "low");
    expect(lowPriorityStat).toMatchObject({ scheduled: 1, completed: 1 });

    const mondayStat = summary.byDay.find((day) => createDateKey(day.date) === createDateKey(monday));
    expect(mondayStat).toMatchObject({ scheduled: 2, completed: 2 });
    const wednesdayStat = summary.byDay.find((day) => createDateKey(day.date) === createDateKey(wednesday));
    expect(wednesdayStat).toMatchObject({ scheduled: 1, completed: 0 });
    expect(summary.byDay).toHaveLength(7);
  });

  it("returns all-zero stats for an empty item list", () => {
    const summary = computeStatsSummary([], categories, week, new Map());
    expect(summary).toMatchObject({ scheduled: 0, completed: 0, byCategory: [], byPriority: [] });
    expect(summary.byDay.every((day) => day.scheduled === 0 && day.completed === 0)).toBe(true);
  });
});

describe("toWeekChartBars", () => {
  it("labels each day with its weekday letter, keyed by date", () => {
    const week = buildWeek(new Date(2026, 8, 23)); // Sun 2026-09-20 〜 Sat 2026-09-26
    const byDay: DailyStat[] = week.map((date, index) => ({ date, scheduled: index, completed: 0 }));

    const bars = toWeekChartBars(byDay);

    expect(bars).toHaveLength(7);
    expect(bars[0]).toMatchObject({ key: createDateKey(week[0]), label: "日", scheduled: 0 });
    expect(bars[1]).toMatchObject({ key: createDateKey(week[1]), label: "月", scheduled: 1 });
  });
});

describe("groupDailyStatsByWeekOfMonth", () => {
  it("buckets days into calendar weeks of the month and sums scheduled/completed", () => {
    // 2026-09-01は火曜(getDay()=2)始まりの月。9/1〜9/5が1週目、9/6(日)から2週目、9/30(水)は5週目。
    const byDay: DailyStat[] = [
      { date: new Date(2026, 8, 1), scheduled: 1, completed: 1 }, // week 0 (1週)
      { date: new Date(2026, 8, 5), scheduled: 2, completed: 1 }, // week 0 (1週)
      { date: new Date(2026, 8, 6), scheduled: 3, completed: 0 }, // week 1 (2週)
      { date: new Date(2026, 8, 30), scheduled: 1, completed: 1 }, // week 4 (5週)
    ];

    const bars = groupDailyStatsByWeekOfMonth(byDay);

    expect(bars).toEqual([
      { key: "week-0", label: "1週", scheduled: 3, completed: 2 },
      { key: "week-1", label: "2週", scheduled: 3, completed: 0 },
      { key: "week-4", label: "5週", scheduled: 1, completed: 1 },
    ]);
  });

  it("returns an empty array for no days", () => {
    expect(groupDailyStatsByWeekOfMonth([])).toEqual([]);
  });
});

describe("groupDailyStatsByMonth", () => {
  it("buckets days into months and sums scheduled/completed, sorted ascending", () => {
    const byDay: DailyStat[] = [
      { date: new Date(2026, 2, 15), scheduled: 2, completed: 1 }, // March
      { date: new Date(2026, 0, 1), scheduled: 1, completed: 1 }, // January
      { date: new Date(2026, 0, 31), scheduled: 1, completed: 0 }, // January
    ];

    const bars = groupDailyStatsByMonth(byDay);

    expect(bars).toEqual([
      { key: "month-0", label: "1", scheduled: 2, completed: 1 },
      { key: "month-2", label: "3", scheduled: 2, completed: 1 },
    ]);
  });
});
