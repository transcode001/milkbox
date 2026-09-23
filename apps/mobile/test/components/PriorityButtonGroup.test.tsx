import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { PriorityButtonGroup } from "../../src/components/PriorityButtonGroup";

describe("PriorityButtonGroup", () => {
  it("marks the current value as selected and reports the tapped option", () => {
    const onChange = jest.fn();
    const { getByRole } = render(<PriorityButtonGroup value="medium" onChange={onChange} />);

    expect(getByRole("radio", { name: "高" }).props.accessibilityState).toMatchObject({ selected: false });
    expect(getByRole("radio", { name: "中" }).props.accessibilityState).toMatchObject({ selected: true });

    fireEvent.press(getByRole("radio", { name: "低" }));
    expect(onChange).toHaveBeenCalledWith("low");
  });

  it("ignores presses while disabled", () => {
    const onChange = jest.fn();
    const { getByRole } = render(<PriorityButtonGroup value="medium" onChange={onChange} disabled />);

    fireEvent.press(getByRole("radio", { name: "高" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
