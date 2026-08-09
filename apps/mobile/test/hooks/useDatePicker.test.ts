import { act, renderHook } from "@testing-library/react-native";
import { Platform } from "react-native";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useDatePicker } from "../../src/hooks/useDatePicker";

const setEvent = { type: "set" } as DateTimePickerEvent;
const dismissedEvent = { type: "dismissed" } as DateTimePickerEvent;

describe("useDatePicker", () => {
  afterEach(() => {
    Platform.OS = "ios";
  });

  it("closes the date picker after selecting a date", () => {
    const { result } = renderHook(() => useDatePicker());
    const selectedDate = new Date(2026, 7, 10);

    act(() => {
      result.current.openDatePicker("start", "date");
    });
    act(() => {
      result.current.onDateChange(setEvent, selectedDate);
    });

    expect(result.current.startDate?.getDate()).toBe(10);
    expect(result.current.startHasDate).toBe(true);
    expect(result.current.activeDatePicker).toBeNull();
  });

  it("does not mark a time as set just by opening the time picker", () => {
    const { result } = renderHook(() => useDatePicker());

    act(() => {
      result.current.openDatePicker("start", "time");
    });

    expect(result.current.startDate).toBeNull();
    expect(result.current.startHasTime).toBe(false);
    expect(result.current.activeDatePicker).toEqual({ field: "start", mode: "time" });
  });

  it("marks a time as set only after selecting one", () => {
    const { result } = renderHook(() => useDatePicker());
    const selectedTime = new Date(2026, 7, 10, 8, 30);

    act(() => {
      result.current.openDatePicker("start", "time");
    });
    act(() => {
      result.current.onDateChange(setEvent, selectedTime);
    });

    expect(result.current.startDate?.getHours()).toBe(8);
    expect(result.current.startDate?.getMinutes()).toBe(30);
    expect(result.current.startHasDate).toBe(false);
    expect(result.current.startHasTime).toBe(true);
  });

  it("keeps the date picker open when dismissed on iOS", () => {
    const { result } = renderHook(() => useDatePicker());

    act(() => {
      result.current.openDatePicker("end", "date");
    });
    act(() => {
      result.current.onDateChange(dismissedEvent);
    });

    expect(result.current.endDate).toBeNull();
    expect(result.current.activeDatePicker).toEqual({ field: "end", mode: "date" });
  });

  it("keeps the time picker open on iOS after selecting a time (spinner fires onChange continuously)", () => {
    Platform.OS = "ios";
    const { result } = renderHook(() => useDatePicker());
    const selectedTime = new Date(2026, 7, 10, 8, 30);

    act(() => {
      result.current.openDatePicker("start", "time");
    });
    act(() => {
      result.current.onDateChange(setEvent, selectedTime);
    });

    expect(result.current.startHasTime).toBe(true);
    expect(result.current.activeDatePicker).toEqual({ field: "start", mode: "time" });
  });

  it("closes the time picker on Android after selecting a time", () => {
    Platform.OS = "android";
    const { result } = renderHook(() => useDatePicker());
    const selectedTime = new Date(2026, 7, 10, 8, 30);

    act(() => {
      result.current.openDatePicker("start", "time");
    });
    act(() => {
      result.current.onDateChange(setEvent, selectedTime);
    });

    expect(result.current.startHasTime).toBe(true);
    expect(result.current.activeDatePicker).toBeNull();
  });

  it("closes the date picker on iOS after selecting a date (single-tap calendar selection)", () => {
    Platform.OS = "ios";
    const { result } = renderHook(() => useDatePicker());
    const selectedDate = new Date(2026, 7, 10);

    act(() => {
      result.current.openDatePicker("start", "date");
    });
    act(() => {
      result.current.onDateChange(setEvent, selectedDate);
    });

    expect(result.current.startHasDate).toBe(true);
    expect(result.current.activeDatePicker).toBeNull();
  });
});
