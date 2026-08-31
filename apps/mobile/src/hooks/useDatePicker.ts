import { useState } from "react";
import { Platform } from "react-native";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";

export type DateField = "start" | "end";
export type DatePickerMode = "date" | "time";
export type ActiveDatePicker = { field: DateField; mode: DatePickerMode } | null;

export interface UseDatePickerResult {
  startDate: Date | null;
  endDate: Date | null;
  startHasDate: boolean;
  endHasDate: boolean;
  startHasTime: boolean;
  endHasTime: boolean;
  activeDatePicker: ActiveDatePicker;
  setActiveDatePicker: React.Dispatch<React.SetStateAction<ActiveDatePicker>>;
  onDateChange: (event: DateTimePickerEvent, selectedDate?: Date) => void;
  openDatePicker: (field: DateField, mode?: DatePickerMode) => void;
  clearDate: (field: DateField) => void;
  formatDate: (date: Date) => string;
  formatTime: (date: Date) => string;
  formatDateTime: (date: Date) => string;
}

export const mergeDatePart = (current: Date | null, selectedDate: Date): Date => {
  const base = current ?? new Date();
  return new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
    base.getHours(),
    base.getMinutes(),
    0,
    0,
  );
};

export const mergeTimePart = (current: Date | null, selectedDate: Date): Date => {
  const base = current ?? new Date();
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    selectedDate.getHours(),
    selectedDate.getMinutes(),
    0,
    0,
  );
};

export const useDatePicker = (): UseDatePickerResult => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startHasDate, setStartHasDate] = useState(false);
  const [endHasDate, setEndHasDate] = useState(false);
  const [startHasTime, setStartHasTime] = useState(false);
  const [endHasTime, setEndHasTime] = useState(false);
  const [activeDatePicker, setActiveDatePicker] = useState<ActiveDatePicker>(null);

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (!activeDatePicker) {
      return;
    }

    if (event.type === "dismissed") {
      if (Platform.OS === "android") {
        setActiveDatePicker(null);
      }
      return;
    }

    if (!selectedDate) {
      return;
    }

    const updateValue = (current: Date | null) =>
      activeDatePicker.mode === "date"
        ? mergeDatePart(current, selectedDate)
        : mergeTimePart(current, selectedDate);

    if (activeDatePicker.field === "start") {
      setStartDate((current) => updateValue(current));
      if (activeDatePicker.mode === "date") setStartHasDate(true);
      if (activeDatePicker.mode === "time") setStartHasTime(true);
    } else {
      setEndDate((current) => updateValue(current));
      if (activeDatePicker.mode === "date") setEndHasDate(true);
      if (activeDatePicker.mode === "time") setEndHasTime(true);
    }

    // iOS の time スピナーは操作中に onChange が連続発火するため、date
    // (カレンダー/1タップ選択) のときだけ自動で閉じる。time は既存の「閉じる」
    // ボタンでユーザーが確定するまでパネルを開いたままにする。
    if (Platform.OS === "android" || activeDatePicker.mode === "date") {
      setActiveDatePicker(null);
    }
  };

  const openDatePicker = (field: DateField, mode: DatePickerMode = "date") => {
    setActiveDatePicker({ field, mode });
  };

  const clearDate = (field: DateField) => {
    if (field === "start") {
      setStartDate(null);
      setStartHasDate(false);
      setStartHasTime(false);
    } else {
      setEndDate(null);
      setEndHasDate(false);
      setEndHasTime(false);
    }
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatDateTime = (date: Date): string => {
    return `${formatDate(date)} ${formatTime(date)}`;
  };

  return {
    startDate,
    endDate,
    startHasDate,
    endHasDate,
    startHasTime,
    endHasTime,
    activeDatePicker,
    setActiveDatePicker,
    onDateChange,
    openDatePicker,
    clearDate,
    formatDate,
    formatTime,
    formatDateTime,
  };
};
