import React, { useState } from "react";
import { fireEvent, render } from "@testing-library/react-native";
import type { Recurrence } from "@milkbox/shared";
import { RecurrenceEditor } from "../../src/components/RecurrenceEditor";

// RecurrenceEditorは呼び出し側が管理するvalueに従って表示を変えるcontrolled
// コンポーネントなので、テストでも実際の画面と同じくonChangeの結果を
// state経由でvalueへ反映するラッパーを介して検証する。
function ControlledRecurrenceEditor({
  initial, onChange,
}: { initial: Recurrence | null; onChange: (value: Recurrence | null) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <RecurrenceEditor
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("RecurrenceEditor", () => {
  it("reports null when なし is selected", () => {
    const onChange = jest.fn();
    const { getByRole } = render(<ControlledRecurrenceEditor initial={{ type: "monthly" }} onChange={onChange} />);
    fireEvent.press(getByRole("radio", { name: "なし" }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("reports a plain type object for 隔週/毎月", () => {
    const onChange = jest.fn();
    const { getByRole } = render(<ControlledRecurrenceEditor initial={null} onChange={onChange} />);
    fireEvent.press(getByRole("radio", { name: "隔週" }));
    expect(onChange).toHaveBeenCalledWith({ type: "biweekly" });
  });

  it("shows the day-count input only for N日ごと, defaulting it and reporting changes", () => {
    const onChange = jest.fn();
    const { getByRole, getByLabelText, queryByLabelText } = render(
      <ControlledRecurrenceEditor initial={null} onChange={onChange} />,
    );
    expect(queryByLabelText("繰り返す日数")).toBeNull();

    fireEvent.press(getByRole("radio", { name: "N日ごと" }));
    expect(onChange).toHaveBeenCalledWith({ type: "everyNDays", days: 3 });

    fireEvent.changeText(getByLabelText("繰り返す日数"), "10");
    expect(onChange).toHaveBeenCalledWith({ type: "everyNDays", days: 10 });
  });

  it("ignores an out-of-range or non-numeric day count without calling onChange", () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <ControlledRecurrenceEditor initial={{ type: "everyNDays", days: 3 }} onChange={onChange} />,
    );
    fireEvent.changeText(getByLabelText("繰り返す日数"), "abc");
    fireEvent.changeText(getByLabelText("繰り返す日数"), "1");
    fireEvent.changeText(getByLabelText("繰り返す日数"), "400");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clamps an out-of-range day count when switching into everyNDays from a stale value", () => {
    const onChange = jest.fn();
    const { getByRole, getByLabelText } = render(
      <ControlledRecurrenceEditor initial={null} onChange={onChange} />,
    );
    fireEvent.press(getByRole("radio", { name: "N日ごと" }));
    fireEvent.changeText(getByLabelText("繰り返す日数"), "400");
    fireEvent.press(getByRole("radio", { name: "毎月" }));
    fireEvent.press(getByRole("radio", { name: "N日ごと" }));
    expect(onChange).toHaveBeenLastCalledWith({ type: "everyNDays", days: 365 });
  });
});
