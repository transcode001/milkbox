import type { SavedItem } from "@milkbox/shared";
import { buildDayRange, moveDayRange, buildWeek, createDateKey, formatWeekRangeLabel } from "../../src/utils/calendarDates";
import { getDayRangeSwipeOffset, getDayEvents, layoutDayEvents, type DayEvent } from "../../src/utils/weekTimeline";

const item: SavedItem = {
  id: 1, text: "予定", date: "2026-07-20", color: "#7986CB",
  notificationEnabled: false, notificationMinutesBefore: 30,
};
describe("week dates", () => {
  it("builds a Sunday-based week across year boundaries", () => {
    const week = buildWeek(new Date(2027, 0, 1));
    expect(week.map(createDateKey)).toEqual(["2026-12-27", "2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
  });
  it("formats same month, month boundary and year boundary labels", () => {
    expect(formatWeekRangeLabel(new Date(2026, 6, 19), new Date(2026, 6, 25))).toBe("7月19日 − 25日");
    expect(formatWeekRangeLabel(new Date(2026, 6, 26), new Date(2026, 7, 1))).toBe("7月26日 − 8月1日");
    expect(formatWeekRangeLabel(new Date(2026, 11, 27), new Date(2027, 0, 2))).toBe("2026年12月27日 − 2027年1月2日");
  });
});
describe("getDayEvents", () => {
  it("expands repeating weekdays, ignoring stored dates", () => {
    const repeating = { ...item, weekdays: "[1,3,5]", startDate: "2020-01-01T09:00:00", endDate: "2020-01-01T10:30:00" };
    const days = buildWeek(new Date(2026, 6, 20)).map(day => getDayEvents([repeating], day));
    expect(days.map(day => day.timed.length)).toEqual([0, 1, 0, 1, 0, 1, 0]);
    expect(days[1].timed[0]).toMatchObject({ startMinutes: 540, endMinutes: 630 });
  });
  it("shows single tasks only on their actual day and defaults missing end to one hour", () => {
    const task = { ...item, startDate: "2026-07-20T23:30:00" };
    expect(getDayEvents([task], new Date(2026, 6, 20)).timed[0]).toMatchObject({ startMinutes: 1410, endMinutes: 1440 });
    expect(getDayEvents([task], new Date(2026, 6, 21)).timed).toEqual([]);
  });
  it("places multiday and untimed repeating tasks in the all-day area", () => {
    const range = { ...item, startDate: "2026-07-19T09:00:00", endDate: "2026-07-21T18:00:00" };
    expect(getDayEvents([range], new Date(2026, 6, 20)).allDay).toEqual([range]);
    expect(getDayEvents([range], new Date(2026, 6, 22)).allDay).toEqual([]);
    const repeating = { ...item, weekdays: "[1]", date: "2026-07-20T16:00:00" };
    expect(getDayEvents([repeating], new Date(2026, 6, 20)).allDay).toEqual([repeating]);
  });
  it("handles end-only tasks and invalid dates", () => {
    expect(getDayEvents([{ ...item, endDate: "2026-07-20T10:00:00" }], new Date(2026, 6, 20)).timed[0])
      .toMatchObject({ startMinutes: 540, endMinutes: 600 });
    expect(getDayEvents([{ ...item, date: "invalid" }], new Date(2026, 6, 20))).toEqual({ timed: [], allDay: [] });
  });
});
describe("layoutDayEvents", () => {
  const event = (id: number, startMinutes: number, endMinutes: number): DayEvent =>
    ({ item: { ...item, id }, startMinutes, endMinutes });
  it("splits overlapping events, reuses free lanes and restores full width after a group", () => {
    const input = [event(1, 540, 720), event(2, 540, 600), event(3, 600, 660), event(4, 780, 840)];
    const result = layoutDayEvents(input);
    expect(result.map(e => [e.lane, e.laneCount])).toEqual([[0, 2], [1, 2], [1, 2], [0, 1]]);
    expect(input[0]).not.toHaveProperty("lane");
  });
  it("reserves visual space for short events and handles identical starts", () => {
    const result = layoutDayEvents([event(1, 540, 541), event(2, 550, 551), event(3, 550, 551)]);
    expect(result.map(e => e.laneCount)).toEqual([3, 3, 3]);
    expect(new Set(result.map(e => e.lane)).size).toBe(3);
  });
  it("returns an empty layout for an empty day", () => {
    expect(layoutDayEvents([])).toEqual([]);
  });
});


describe("day ranges", () => {
  it("keeps weekly alignment and anchors shorter ranges at midnight without mutating the date", () => {
    const anchor = new Date(2026, 11, 31, 15, 30);
    expect(buildDayRange(anchor, 7)).toEqual(buildWeek(anchor));
    expect(buildDayRange(anchor, 1).map(createDateKey)).toEqual(["2026-12-31"]);
    expect(buildDayRange(anchor, 3).map(createDateKey)).toEqual(["2026-12-31", "2027-01-01", "2027-01-02"]);
    expect(buildDayRange(anchor, 3).every(day => day.getHours() === 0)).toBe(true);
    expect(anchor.getHours()).toBe(15);
    expect(formatWeekRangeLabel(anchor, anchor)).toBe("12月31日");
  });
  it.each([
    [1, 1, "2027-01-01"], [1, -1, "2026-12-30"],
    [3, 1, "2027-01-03"], [3, -1, "2026-12-28"],
    [7, 1, "2027-01-03"], [7, -1, "2026-12-20"],
  ])("moves %i days by %i ranges across boundaries", (count, offset, expected) => {
    expect(createDateKey(moveDayRange(new Date(2026, 11, 31), count, offset))).toBe(expected);
  });
  it("includes leap day", () => {
    expect(buildDayRange(new Date(2028, 1, 28), 3).map(createDateKey))
      .toEqual(["2028-02-28", "2028-02-29", "2028-03-01"]);
  });
});

describe("getDayRangeSwipeOffset", () => {
  it.each([1, 3])("moves left forward and right backward in %i-day mode", count => {
    expect(getDayRangeSwipeOffset(count, -80, 5, -100)).toBe(1);
    expect(getDayRangeSwipeOffset(count, 80, 5, 100)).toBe(-1);
    expect(getDayRangeSwipeOffset(count, -25, 0, -600)).toBe(1);
    expect(getDayRangeSwipeOffset(count, 25, 0, 600)).toBe(-1);
  });
  it("ignores weekly, vertical, diagonal, tiny and cancelled-direction gestures", () => {
    expect(getDayRangeSwipeOffset(7, -150, 0, -900)).toBe(0);
    expect(getDayRangeSwipeOffset(3, 80, 100, 600)).toBe(0);
    expect(getDayRangeSwipeOffset(1, 80, 60, 600)).toBe(0);
    expect(getDayRangeSwipeOffset(1, 10, 0, 900)).toBe(0);
    expect(getDayRangeSwipeOffset(3, 30, 0, 100)).toBe(0);
    expect(getDayRangeSwipeOffset(3, 30, 0, -600)).toBe(0);
  });
});
