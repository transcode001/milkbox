import { useRef, useState } from "react";
import {
  DEFAULT_REMINDER_MINUTES,
  NONE_REMINDER_VALUE,
  REMINDER_OPTIONS,
  resolveReminderMinutesToRestore,
} from "@milkbox/shared";
import type { SelectOption } from "../components/SelectModal";

// AddTaskScreen(作成)とHomeScreenの編集モーダルで全く同じ「通知タイミングを
// 選ぶチェックボックス+ドロップダウン」を別々に実装していたことで、以前
// 「無効のまま保存すると元のタイミングが失われる」バグが2箇所で個別に
// 発生・修正される事態になった。ロジックを1箇所にまとめ、同じ不具合が
// 再発しないようにする。
//
// - 有効/無効はnotificationMinutesBeforeがNONE_REMINDER_VALUEかどうかの
//   1つの数値で表現する(元のAddTaskScreenの設計を踏襲)。
// - 「通知を設定しない」を一旦チェックしてから戻した時に元のタイミングへ
//   復元できるよう、直近の実タイミングをrefで覚えておく。
// - 無効のまま保存する場合にDBへ書き込む値はgetPersistableMinutesBefore()を
//   使うこと。notificationMinutesBeforeをそのまま送るとNONE_REMINDER_VALUEで
//   上書きしてしまい、再度有効化した時に元の値へ戻せなくなる。

export const REMINDER_SELECT_OPTIONS: SelectOption[] = REMINDER_OPTIONS
  .filter((option) => option.minutes !== NONE_REMINDER_VALUE)
  .map((option) => ({ value: option.minutes.toString(), label: option.label }));

const DEFAULT_REMINDER_LABEL =
  REMINDER_OPTIONS.find((option) => option.minutes === DEFAULT_REMINDER_MINUTES)?.label
    ?? `${DEFAULT_REMINDER_MINUTES}分前`;

export interface UseReminderPickerResult {
  notificationMinutesBefore: number;
  notificationEnabled: boolean;
  isReminderListOpen: boolean;
  selectedReminderLabel: string;
  setIsReminderListOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleReminderEnabled: () => void;
  selectReminderMinutes: (minutes: number) => void;
  // 既存アイテムを開き直す時(編集フローの再初期化)などに使う。
  resetReminder: (minutesBefore: number, enabled: boolean) => void;
  // 無効のまま保存する時にDBへ渡す値。有効ならnotificationMinutesBeforeを
  // そのまま、無効ならrefに控えた実タイミングを返す(NONE_REMINDER_VALUEを
  // DBへ書き込んで元の値を消してしまわないようにするため)。
  getPersistableMinutesBefore: () => number;
}

export function useReminderPicker(
  initialMinutesBefore: number = DEFAULT_REMINDER_MINUTES,
): UseReminderPickerResult {
  const [notificationMinutesBefore, setNotificationMinutesBefore] = useState(initialMinutesBefore);
  const [isReminderListOpen, setIsReminderListOpen] = useState(false);
  const lastReminderMinutesRef = useRef(resolveReminderMinutesToRestore(initialMinutesBefore));

  const toggleReminderEnabled = () => {
    setNotificationMinutesBefore((current) => {
      if (current === NONE_REMINDER_VALUE) {
        return lastReminderMinutesRef.current;
      }
      lastReminderMinutesRef.current = current;
      return NONE_REMINDER_VALUE;
    });
    setIsReminderListOpen(false);
  };

  const selectReminderMinutes = (minutes: number) => {
    setNotificationMinutesBefore(minutes);
    setIsReminderListOpen(false);
  };

  const resetReminder = (minutesBefore: number, enabled: boolean) => {
    setNotificationMinutesBefore(enabled ? minutesBefore : NONE_REMINDER_VALUE);
    lastReminderMinutesRef.current = resolveReminderMinutesToRestore(minutesBefore);
    setIsReminderListOpen(false);
  };

  const notificationEnabled = notificationMinutesBefore !== NONE_REMINDER_VALUE;

  const selectedReminderLabel = REMINDER_OPTIONS.find(
    (option) => option.minutes === notificationMinutesBefore,
  )?.label ?? DEFAULT_REMINDER_LABEL;

  const getPersistableMinutesBefore = () =>
    notificationEnabled ? notificationMinutesBefore : lastReminderMinutesRef.current;

  return {
    notificationMinutesBefore,
    notificationEnabled,
    isReminderListOpen,
    selectedReminderLabel,
    setIsReminderListOpen,
    toggleReminderEnabled,
    selectReminderMinutes,
    resetReminder,
    getPersistableMinutesBefore,
  };
}
