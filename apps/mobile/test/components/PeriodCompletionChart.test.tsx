import React from "react";
import { render } from "@testing-library/react-native";
import { PeriodCompletionChart } from "../../src/components/PeriodCompletionChart";
import type { ChartBar } from "../../src/utils/completionStats";

describe("PeriodCompletionChart", () => {
  it("does not render a completed segment for a bar with scheduled tasks but zero completions", () => {
    const bar: ChartBar = { key: "d1", label: "月", scheduled: 3, completed: 0 };
    const { queryByTestId, getByTestId } = render(<PeriodCompletionChart bars={[bar]} />);

    expect(queryByTestId(`completed-${bar.key}`)).toBeNull();
    expect(getByTestId(`remaining-${bar.key}`)).toBeTruthy();
  });

  it("does not render a remaining segment once everything scheduled is completed", () => {
    const bar: ChartBar = { key: "d1", label: "月", scheduled: 2, completed: 2 };
    const { queryByTestId, getByTestId } = render(<PeriodCompletionChart bars={[bar]} />);

    expect(queryByTestId(`remaining-${bar.key}`)).toBeNull();
    expect(getByTestId(`completed-${bar.key}`)).toBeTruthy();
  });

  it("renders neither segment for a bar with nothing scheduled", () => {
    const bar: ChartBar = { key: "d1", label: "月", scheduled: 0, completed: 0 };
    const { queryByTestId } = render(<PeriodCompletionChart bars={[bar]} />);

    expect(queryByTestId(`completed-${bar.key}`)).toBeNull();
    expect(queryByTestId(`remaining-${bar.key}`)).toBeNull();
  });

  it("renders both segments proportionally when partially completed", () => {
    const bar: ChartBar = { key: "d1", label: "月", scheduled: 4, completed: 1 };
    const { getByTestId } = render(<PeriodCompletionChart bars={[bar]} />);

    const completed = getByTestId(`completed-${bar.key}`);
    const remaining = getByTestId(`remaining-${bar.key}`);
    const completedHeight = completed.props.style.find((s: { height?: number }) => s?.height !== undefined).height;
    const remainingHeight = remaining.props.style.find((s: { height?: number }) => s?.height !== undefined).height;
    expect(remainingHeight).toBeGreaterThan(completedHeight);
  });

  it("renders each bar's label", () => {
    const bars: ChartBar[] = [
      { key: "w-0", label: "1週", scheduled: 4, completed: 2 },
      { key: "w-1", label: "2週", scheduled: 5, completed: 5 },
    ];
    const { getByText } = render(<PeriodCompletionChart bars={bars} />);

    expect(getByText("1週")).toBeTruthy();
    expect(getByText("2週")).toBeTruthy();
  });
});
