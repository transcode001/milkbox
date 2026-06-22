import { useState } from "react";
import { Platform } from "react-native";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";

export type DateField = "start" | "end";
export type DatePickerMode = "date" | "time";
export type ActiveDatePicker = { field: DateField; mode: DatePickerMode } | null;

export interface UseDatePickerResult {
  startDate: Date | null;
  endDate: Date | null;
  activeDatePicker: ActiveDatePicker;
  setActiveDatePicker: React.Dispatch<React.SetStateAction<ActiveDatePicker>>;
  setStartDate: React.Dispatch<React.SetStateAction<Date | null>>;
  setEndDate: React.Dispatch<React.SetStateAction<Date | null>>;
  onDateChange: (event: DateTimePickerEvent, selectedDate?: Date) => void;
  openDatePicker: (field: DateField, mode?: DatePickerMode) => void;
  clearDate: (field: DateField) => void;
  formatDate: (date: Date) => string;
  formatTime: (date: Date) => string;
  formatDateTime: (date: Date) => string;
}

const mergeDatePart = (current: Date | null, selectedDate: Date): Date => {
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

const mergeTimePart = (current: Date | null, selectedDate: Date): Date => {
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
    } else {
      setEndDate((current) => updateValue(current));
    }

    if (Platform.OS === "android") {
      setActiveDatePicker(null);
    }
  };

  const openDatePicker = (field: DateField, mode: DatePickerMode = "date") => {
    const currentValue = field === "start" ? startDate : endDate;
    if (!currentValue) {
      if (field === "start") {
        setStartDate(new Date());
      } else {
        setEndDate(new Date());
      }
    }

    setActiveDatePicker({ field, mode });
  };

  const clearDate = (field: DateField) => {
    field === "start" ? setStartDate(null) : setEndDate(null);
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0];
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
    activeDatePicker,
    setActiveDatePicker,
    setStartDate,
    setEndDate,
    onDateChange,
    openDatePicker,
    clearDate,
    formatDate,
    formatTime,
    formatDateTime,
  };
};
