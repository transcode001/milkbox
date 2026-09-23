// 「毎週◯曜日」(items.weekdays)は既存のカテゴリ連動の仕組みのまま維持し、
// ここではそれとは独立した繰り返しパターン(隔週・毎月・N日ごと)だけを扱う。
// 起点はitem.startDate(日付部分)を流用する: 隔週はその曜日、毎月はその日、
// N日ごとはその日からの経過日数を基準にする。新たにanchor用の列は増やさない。
export type RecurrenceType = "biweekly" | "monthly" | "everyNDays";

export type Recurrence =
  | { type: "biweekly" }
  | { type: "monthly" }
  | { type: "everyNDays"; days: number };

export interface RecurrenceTypeOption {
  value: RecurrenceType;
  label: string;
}

export const RECURRENCE_TYPE_OPTIONS: readonly RecurrenceTypeOption[] = [
  { value: "biweekly", label: "隔週" },
  { value: "monthly", label: "毎月" },
  { value: "everyNDays", label: "N日ごと" },
];

export const DEFAULT_EVERY_N_DAYS = 3;
export const MIN_EVERY_N_DAYS = 2;
export const MAX_EVERY_N_DAYS = 365;

export function isRecurrence(value: unknown): value is Recurrence {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { type?: unknown; days?: unknown };
  if (candidate.type === "biweekly" || candidate.type === "monthly") return true;
  return (
    candidate.type === "everyNDays" &&
    typeof candidate.days === "number" &&
    Number.isInteger(candidate.days) &&
    candidate.days >= MIN_EVERY_N_DAYS
  );
}
