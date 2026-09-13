import { act, renderHook } from "@testing-library/react-native";
import { Alert } from "react-native";
import { useItemCompletions } from "../../src/hooks/useItemCompletions";

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual("react");
    React.useEffect(callback, [callback]);
  },
}));
const mockRepository = {
  findCompletionsForDate: jest.fn(),
  setCompletion: jest.fn(),
};
const mockManager = { itemRepository: mockRepository };
jest.mock("../../src/contexts/DatabaseContext", () => ({
  useDatabaseManager: () => ({ dbManager: mockManager }),
}));

describe("useItemCompletions", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 13, 23, 59, 59));
    mockRepository.findCompletionsForDate.mockReset().mockImplementation(async (date: string) =>
      new Set(date === "2026-09-13" ? [1] : []));
    mockRepository.setCompletion.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("loads the next day's state at midnight without user navigation", async () => {
    const { result } = renderHook(() => useItemCompletions());
    await act(async () => {});
    expect(result.current.completedIds.has(1)).toBe(true);
    await act(async () => { jest.advanceTimersByTime(1100); });
    expect(mockRepository.findCompletionsForDate).toHaveBeenLastCalledWith("2026-09-14");
    expect(result.current.completedIds.has(1)).toBe(false);
  });

  it("uses the selected calendar date for writes and prevents duplicate taps", async () => {
    const { result } = renderHook(() => useItemCompletions("2026-09-12"));
    await act(async () => {});
    await act(async () => {
      const first = result.current.toggleCompletion(1);
      await result.current.toggleCompletion(1);
      await first;
    });
    expect(mockRepository.setCompletion).toHaveBeenCalledTimes(1);
    expect(mockRepository.setCompletion).toHaveBeenCalledWith(1, "2026-09-12", true);
  });

  it("ignores an older date's load when the selection changes quickly", async () => {
    let resolveOld!: (ids: Set<number>) => void;
    mockRepository.findCompletionsForDate.mockImplementationOnce(() =>
      new Promise<Set<number>>((resolve) => { resolveOld = resolve; }));
    const { result, rerender } = renderHook(({ date }) => useItemCompletions(date),
      { initialProps: { date: "2026-09-13" } });
    rerender({ date: "2026-09-14" });
    await act(async () => {});
    await act(async () => { resolveOld(new Set([1])); });
    expect(result.current.completedIds.has(1)).toBe(false);
    expect(result.current.disabled).toBe(false);
  });

  it("keeps the saved state if an update fails", async () => {
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockRepository.setCompletion.mockRejectedValue(new Error("failed"));
    const { result } = renderHook(() => useItemCompletions());
    await act(async () => {});
    await act(async () => { await result.current.toggleCompletion(1); });
    expect(result.current.completedIds.has(1)).toBe(true);
    expect(result.current.disabled).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith("エラー", "完了状態の更新に失敗しました");
  });
});
