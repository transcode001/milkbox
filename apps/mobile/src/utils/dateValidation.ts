const startOfDay = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export function isEndDateBeforeStartDate(
  startDate: Date | null,
  endDate: Date | null,
  startHasTime = true,
  endHasTime = true,
): boolean {
  if (!startDate || !endDate) {
    return false;
  }

  const startValue = startHasTime ? startDate.getTime() : startOfDay(startDate);
  const endValue = endHasTime ? endDate.getTime() : startOfDay(endDate);

  return endValue < startValue;
}

export function toSavedDate(date: Date, hasTime: boolean): string {
  if (hasTime) return date.toISOString();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// カテゴリを選択している間、AddTaskScreenの開始/終了は「時間」ボタンしか
// 出ず(「日付」ボタンは非表示)、日付部分はピッカーの初期値(今日)が
// そのまま残る。この日付部分を終了<開始の判定に混ぜると、実際には時刻だけの
// 指定のつもりが日付の巡り合わせで意図しない前後関係になり得るため、
// 固定の同じ日付に揃えて「時刻だけ」を比較できるようにする。
export function stripDateForTimeOnlyComparison(date: Date | null): Date | null {
  if (!date) return date;
  return new Date(2000, 0, 1, date.getHours(), date.getMinutes());
}

export function resolveScheduleWeekdays(
  hasDate: boolean,
  inheritedWeekdays: number[],
): number[] {
  if (hasDate) return [];
  return inheritedWeekdays;
}
