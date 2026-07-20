export interface ReminderOption {
  minutes: number;
  label: string;
}

// 通知しない選択を表す番兵値。notificationMinutesBeforeに保存され、
// notificationEnabled = false と対で扱われる(実際の分数計算には使わない)。
export const NONE_REMINDER_VALUE = -1;

// Google Calendarの通知(ポップアップ)選択肢に合わせる
export const REMINDER_OPTIONS: readonly ReminderOption[] = [
  { minutes: NONE_REMINDER_VALUE, label: "なし" },
  { minutes: 0, label: "開始時間" },
  { minutes: 5, label: "5分前" },
  { minutes: 10, label: "10分前" },
  { minutes: 15, label: "15分前" },
  { minutes: 30, label: "30分前" },
  { minutes: 60, label: "1時間前" },
  { minutes: 120, label: "2時間前" },
  { minutes: 1440, label: "1日前" },
  { minutes: 2880, label: "2日前" },
  { minutes: 10080, label: "1週間前" },
];

// Google Calendarのデフォルト値(30分前)に合わせる
export const DEFAULT_REMINDER_MINUTES = 30;
