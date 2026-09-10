// 月カレンダーの週内に描画するガントバー(複数日タスク・曜日繰り返しタスク)の
// 列位置・レーン割り当てを計算するユーティリティ。
import type { SavedItem } from "@milkbox/shared";
import { createDateKey, parseItemDate, startOfDay } from "./calendarDates";
import { parseWeekdays } from "./weekdays";

export interface RangeBarEntry {
  item: SavedItem;
  startCol: number;
  endCol: number;
  continuesLeft: boolean;
  continuesRight: boolean;
  isWeekday: boolean;
  lane: number;
}

// 同じ週内でバーが重なる場合、開いている一番上のレーンに詰めて配置する
// (縦方向のスタック計算)。
function assignLanes(entries: Omit<RangeBarEntry, "lane">[]): RangeBarEntry[] {
  const laneEnds: number[] = [];
  return entries.map((entry) => {
    let lane = laneEnds.findIndex((end) => end < entry.startCol);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = entry.endCol;
    return { ...entry, lane };
  });
}

export function getRangeBarsForWeek(
  rangeItems: SavedItem[],
  weekdayItems: SavedItem[],
  week: Date[],
): RangeBarEntry[] {
  const weekStart = startOfDay(week[0]);
  const weekEnd = startOfDay(week[6]);
  const entries: Omit<RangeBarEntry, "lane">[] = [];

  for (const item of rangeItems) {
    if (!item.startDate || !item.endDate) continue;
    const itemStart = parseItemDate(item.startDate);
    const itemEnd = parseItemDate(item.endDate);
    if (!itemStart || !itemEnd) continue;
    if (itemEnd < weekStart || itemStart > weekEnd) continue;

    const cs = itemStart < weekStart ? weekStart : itemStart;
    const ce = itemEnd > weekEnd ? weekEnd : itemEnd;
    const startCol = week.findIndex((d) => createDateKey(d) === createDateKey(cs));
    const endCol = week.findIndex((d) => createDateKey(d) === createDateKey(ce));
    if (startCol === -1 || endCol === -1) continue;

    entries.push({
      item,
      startCol,
      endCol,
      continuesLeft: itemStart < weekStart,
      continuesRight: itemEnd > weekEnd,
      isWeekday: false,
    });
  }

  for (const item of weekdayItems) {
    const weekdaySet = new Set(parseWeekdays(item.weekdays));
    const selectedCols = week
      .map((date, index) => (weekdaySet.has(date.getDay()) ? index : null))
      .filter((index): index is number => index !== null);
    if (selectedCols.length === 0) continue;

    let startCol = selectedCols[0];
    let endCol = selectedCols[0];

    for (const currentCol of selectedCols.slice(1)) {
      if (currentCol === endCol + 1) {
        endCol = currentCol;
        continue;
      }

      entries.push({
        item,
        startCol,
        endCol,
        continuesLeft: false,
        continuesRight: false,
        isWeekday: true,
      });

      startCol = currentCol;
      endCol = currentCol;
    }

    if (startCol !== undefined && endCol !== undefined) {
      entries.push({
        item,
        startCol,
        endCol,
        continuesLeft: false,
        continuesRight: false,
        isWeekday: true,
      });
    }
  }

  entries.sort((a, b) => a.startCol - b.startCol || a.endCol - b.endCol);
  return assignLanes(entries);
}
