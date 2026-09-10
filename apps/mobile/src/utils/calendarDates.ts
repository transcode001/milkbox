// カレンダーグリッド(月表示・週配列)や日付キー生成など、時刻を持たない
// 「日付そのもの」の計算をまとめたユーティリティ。
// SavedItem を扱うスケジュール集計・表示ロジックは scheduleGrouping.ts /
// ganttBars.ts 側に置き、ここには依存させない。

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function createDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function toDateKey(value: string): string {
  if (value.includes("T") || value.includes(" ")) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return value;
}

export function parseItemDate(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return startOfDay(parsed);
}

// 単発タスクの「発生時刻」を解決する。日付のみの文字列(時刻情報なし)は
// 9時扱いにして、時刻順ソートやガントバー計算で安定した値を返す。
export function parsePointDate(value?: string): Date | null {
  if (!value) return null;

  if (!value.includes("T") && !value.includes(" ")) {
    const parts = value.split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2], 9, 0, 0, 0);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getCalendarStart(date: Date): Date {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  return new Date(
    firstDayOfMonth.getFullYear(),
    firstDayOfMonth.getMonth(),
    firstDayOfMonth.getDate() - firstDayOfMonth.getDay(),
  );
}

export function buildMonthGrid(date: Date): Date[][] {
  const startDate = getCalendarStart(date);
  return Array.from({ length: 6 }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const offset = weekIndex * 7 + dayIndex;
      return new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate() + offset,
      );
    }),
  );
}

export function formatMonthLabel(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}
