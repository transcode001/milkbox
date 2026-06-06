import { useState } from "react";
import { Platform } from "react-native";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";

export type ActiveDateField = "start" | "end" | null;
export type DateField = "start" | "end";

export interface UseDatePickerResult {
  startDate: Date | null;
  endDate: Date | null;
  activeDateField: ActiveDateField;
  setActiveDateField: React.Dispatch<React.SetStateAction<ActiveDateField>>;
  setStartDate: React.Dispatch<React.SetStateAction<Date | null>>;
  setEndDate: React.Dispatch<React.SetStateAction<Date | null>>;
  onDateChange: (event: DateTimePickerEvent, selectedDate?: Date) => void;
  openDatePicker: (field: DateField) => void;
  clearDate: (field: DateField) => void;
  formatDate: (date: Date) => string;
}

export const useDatePicker = (): UseDatePickerResult => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [activeDateField, setActiveDateField] = useState<ActiveDateField>(null);

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (!activeDateField) {
      return;
    }

    if (event.type === "dismissed") {
      if (Platform.OS === "android") {
        setActiveDateField(null);
      }
      return;
    }

    if (!selectedDate) {
      return;
    }

    if (activeDateField === "start") {
      setStartDate(selectedDate);
    } else {
      setEndDate(selectedDate);
    }

    if (Platform.OS === "android") {
      setActiveDateField(null);
    }
  };

  const openDatePicker = (field: DateField) => {
    if (field === "start" && !startDate) {
      setStartDate(new Date());
    } else if (field === "end" && !endDate) {
      setEndDate(new Date());
    }

    setActiveDateField(field);
  };

  const clearDate = (field: DateField) => {
    field === "start" ? setStartDate(null) : setEndDate(null);
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  return {
    startDate,
    endDate,
    activeDateField,
    setActiveDateField,
    setStartDate,
    setEndDate,
    onDateChange,
    openDatePicker,
    clearDate,
    formatDate,
  };
};