import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import StatsScreen from "../../src/screens/StatsScreen";
import type { SavedItem } from "@milkbox/shared";

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => void) => {
    const ReactActual = jest.requireActual("react");
    ReactActual.useEffect(callback, [callback]);
  },
}));

const baseItem: SavedItem = {
  id: 1,
  text: "牛乳を買う",
  date: "2026-09-20",
  color: "#7986CB",
  notificationEnabled: false,
  notificationMinutesBefore: 30,
  priority: "medium",
};

const mockItemRepository = {
  findAllWithCategory: jest.fn().mockResolvedValue([]),
  findCompletionsInRange: jest.fn().mockResolvedValue([]),
};
const mockCategoryRepository = { findAll: jest.fn().mockResolvedValue([]) };
const mockDbManager = {
  itemRepository: mockItemRepository,
  categoryRepository: mockCategoryRepository,
};
jest.mock("../../src/contexts/DatabaseContext", () => ({
  useDatabaseManager: () => ({ dbManager: mockDbManager }),
}));

describe("StatsScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // 2026-09-23 (水), visible week is Sun 2026-09-20 〜 Sat 2026-09-26
    jest.setSystemTime(new Date(2026, 8, 23));
    mockItemRepository.findAllWithCategory.mockReset().mockResolvedValue([
      { ...baseItem, id: 1, categoryId: 1, categoryName: "買い物", priority: "high", weekdays: "[1,3,5]" },
      { ...baseItem, id: 2, categoryId: 2, categoryName: "家事", priority: "low", date: "2026-09-22" },
    ]);
    mockCategoryRepository.findAll.mockReset().mockResolvedValue([
      { id: 1, name: "買い物", color: "#4CAF50" },
      { id: 2, name: "家事", color: "#F48FB1" },
    ]);
    mockItemRepository.findCompletionsInRange.mockReset().mockResolvedValue([
      { itemId: 1, date: "2026-09-21" },
      { itemId: 1, date: "2026-09-23" },
      { itemId: 2, date: "2026-09-22" },
    ]);
  });
  afterEach(() => jest.useRealTimers());

  it("shows the overall completion rate and the category/priority breakdown for the current week", async () => {
    const { getByText, getAllByText } = render(<StatsScreen />);

    await waitFor(() => expect(mockItemRepository.findAllWithCategory).toHaveBeenCalled());
    // item1(weekdays月水金・優先度高): 週内3回発生・2回完了。
    // item2(単発・優先度低): 1回発生・1回完了。合計4回発生・3回完了 = 75%。
    expect(await waitFor(() => getByText("75"))).toBeTruthy();
    expect(getByText("3 / 4 件完了")).toBeTruthy();

    expect(getByText("買い物")).toBeTruthy();
    expect(getByText("家事")).toBeTruthy();
    expect(getByText("高")).toBeTruthy();
    expect(getByText("低")).toBeTruthy();
    expect(getByText("中")).toBeTruthy();

    // 「買い物」カテゴリと「高」優先度がどちらも2/3、「家事」と「低」優先度が
    // どちらも1/1で一致するため、件数の一致は行数(2件ずつ)で確認する。
    expect(getAllByText("2/3")).toHaveLength(2);
    expect(getAllByText("1/1")).toHaveLength(2);
    expect(getByText("0/0")).toBeTruthy();
  });

  it("shows an empty state when nothing is scheduled for the week", async () => {
    mockItemRepository.findAllWithCategory.mockResolvedValue([]);
    mockItemRepository.findCompletionsInRange.mockResolvedValue([]);
    const { getByText } = render(<StatsScreen />);

    await waitFor(() => expect(mockItemRepository.findAllWithCategory).toHaveBeenCalled());
    expect(await waitFor(() => getByText("この週に予定されたタスクはありません"))).toBeTruthy();
  });

  it("reloads completions for the newly selected week when navigating", async () => {
    const { getByLabelText } = render(<StatsScreen />);
    await waitFor(() => expect(mockItemRepository.findCompletionsInRange).toHaveBeenCalledWith("2026-09-20", "2026-09-26"));

    fireEvent.press(getByLabelText("前へ"));

    await waitFor(() => expect(mockItemRepository.findCompletionsInRange).toHaveBeenCalledWith("2026-09-13", "2026-09-19"));
  });

  it("keeps the newest week's completions even when an older, superseded request resolves later", async () => {
    // 曜日繰り返し(毎週日曜)なので、どの週でも発生数は常に1件になる。
    // 差が出るのは「完了数」だけにして、どちらの応答が反映されたかを判別する。
    mockItemRepository.findAllWithCategory.mockResolvedValue([
      { ...baseItem, id: 1, categoryId: undefined, weekdays: "[0]" },
    ]);

    let resolveOlder!: (value: { itemId: number; date: string }[]) => void;
    let resolveNewer!: (value: { itemId: number; date: string }[]) => void;
    const olderPromise = new Promise<{ itemId: number; date: string }[]>((resolve) => { resolveOlder = resolve; });
    const newerPromise = new Promise<{ itemId: number; date: string }[]>((resolve) => { resolveNewer = resolve; });

    mockItemRepository.findCompletionsInRange
      .mockResolvedValueOnce([]) // 初回マウント時(今週)
      .mockImplementationOnce(() => olderPromise) // 1回目の「前へ」押下
      .mockImplementationOnce(() => newerPromise); // 2回目の「前へ」押下

    const { getByLabelText, getByText } = render(<StatsScreen />);
    await waitFor(() => expect(mockItemRepository.findCompletionsInRange).toHaveBeenCalledTimes(1));

    fireEvent.press(getByLabelText("前へ"));
    await waitFor(() => expect(mockItemRepository.findCompletionsInRange).toHaveBeenCalledTimes(2));
    fireEvent.press(getByLabelText("前へ"));
    await waitFor(() => expect(mockItemRepository.findCompletionsInRange).toHaveBeenCalledTimes(3));

    // 新しい方(2026-09-06週)を先に解決: その週の日曜(9/6)に完了記録あり。
    resolveNewer([{ itemId: 1, date: "2026-09-06" }]);
    await waitFor(() => expect(getByText("1 / 1 件完了")).toBeTruthy());

    // 古い方(2026-09-13週)が後から解決しても、表示中の新しい週の結果を
    // 空の完了記録で上書きしてはいけない。
    await act(async () => {
      resolveOlder([]);
    });
    expect(getByText("1 / 1 件完了")).toBeTruthy();
  });

  describe("period switcher", () => {
    it("switches to the day view: single-day range, day-specific title, and a single progress row instead of a bar chart", async () => {
      const { getByText, getByRole } = render(<StatsScreen />);
      await waitFor(() => expect(mockItemRepository.findCompletionsInRange).toHaveBeenCalledWith("2026-09-20", "2026-09-26"));

      fireEvent.press(getByRole("radio", { name: "日" }));

      await waitFor(() => expect(mockItemRepository.findCompletionsInRange).toHaveBeenCalledWith("2026-09-23", "2026-09-23"));
      expect(getByText("今日の達成率")).toBeTruthy();
      expect(getByText("9月23日")).toBeTruthy();
      // 週表示のバーチャート(曜日ラベルの棒)の代わりに、単一の進捗行が出る。
      expect(getByText("今日の進捗")).toBeTruthy();
    });

    it("switches to the month view: whole-month range, month title, and week-of-month chart bars", async () => {
      const { getByText, getByRole } = render(<StatsScreen />);
      await waitFor(() => expect(mockItemRepository.findCompletionsInRange).toHaveBeenCalled());

      fireEvent.press(getByRole("radio", { name: "月" }));

      await waitFor(() => expect(mockItemRepository.findCompletionsInRange).toHaveBeenCalledWith("2026-09-01", "2026-09-30"));
      expect(getByText("月の達成率")).toBeTruthy();
      expect(getByText("9月")).toBeTruthy();
      // 2026年9月は1(火)〜30(水)で5週分のバケットになる。
      expect(getByText("1週")).toBeTruthy();
      expect(getByText("5週")).toBeTruthy();
    });

    it("switches to the year view: whole-year range, year title, and month chart bars", async () => {
      const { getByText, getByRole, getByTestId } = render(<StatsScreen />);
      await waitFor(() => expect(mockItemRepository.findCompletionsInRange).toHaveBeenCalled());

      fireEvent.press(getByRole("radio", { name: "年" }));

      await waitFor(() => expect(mockItemRepository.findCompletionsInRange).toHaveBeenCalledWith("2026-01-01", "2026-12-31"));
      expect(getByText("年の達成率")).toBeTruthy();
      expect(getByText("2026年")).toBeTruthy();
      // 月index8=9月のバー(数字ラベルはcountLabelと衝突しうるためtestIDで特定する)。
      expect(getByTestId("bar-label-month-8")).toHaveTextContent("9");
      expect(getByTestId("bar-label-month-0")).toHaveTextContent("1");
    });

    it("keeps the anchor date when switching periods, so month/year reflect the currently visible date", async () => {
      const { getByLabelText, getByRole, getByText } = render(<StatsScreen />);
      await waitFor(() => expect(mockItemRepository.findCompletionsInRange).toHaveBeenCalledWith("2026-09-20", "2026-09-26"));

      // 前の週(2026-09-13週)に移動してから月表示に切り替えると、
      // アンカー(9/16など元の週内の日付基準)が含まれる9月がそのまま出る。
      fireEvent.press(getByLabelText("前へ"));
      await waitFor(() => expect(mockItemRepository.findCompletionsInRange).toHaveBeenCalledWith("2026-09-13", "2026-09-19"));

      fireEvent.press(getByRole("radio", { name: "月" }));
      await waitFor(() => expect(mockItemRepository.findCompletionsInRange).toHaveBeenCalledWith("2026-09-01", "2026-09-30"));
      expect(getByText("9月")).toBeTruthy();
    });
  });
});
