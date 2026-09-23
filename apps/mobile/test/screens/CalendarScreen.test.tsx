import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import CalendarScreen from "../../src/screens/CalendarScreen";
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
  date: "2026-09-05",
  color: "#7986CB",
  notificationEnabled: false,
  notificationMinutesBefore: 30,
  priority: "medium",
};

const mockItemRepository = {
  findAllWithCategory: jest.fn().mockResolvedValue([]),
  findCompletionsForDate: jest.fn().mockResolvedValue(new Set()),
  setCompletion: jest.fn().mockResolvedValue(undefined),
};
const mockTagRepository = {
  findAll: jest.fn().mockResolvedValue([]),
  findAllItemTags: jest.fn().mockResolvedValue([]),
  findTagsForItem: jest.fn().mockResolvedValue([]),
};
const mockUpdateItem = jest.fn().mockResolvedValue(undefined);
const mockDeleteItem = jest.fn().mockResolvedValue(undefined);
const mockDbManager = {
  itemRepository: mockItemRepository,
  categoryRepository: { findAll: jest.fn().mockResolvedValue([]) },
  tagRepository: mockTagRepository,
  updateItem: mockUpdateItem,
  deleteItem: mockDeleteItem,
};
jest.mock("../../src/contexts/DatabaseContext", () => ({
  useDatabaseManager: () => ({ dbManager: mockDbManager, notificationsEnabled: true }),
}));

describe("CalendarScreen month view marks for non-weekday recurrence", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 10)); // 2026-09-10, so the visible month is September
    mockItemRepository.findAllWithCategory.mockResolvedValue([
      { ...baseItem, startDate: "2026-09-05T09:00:00", recurrence: { type: "monthly" } },
    ]);
  });
  afterEach(() => jest.useRealTimers());

  it("counts a monthly-recurring item's occurrence day in the month grid's event marks", async () => {
    const { getByLabelText } = render(<CalendarScreen />);

    await waitFor(() => expect(mockItemRepository.findAllWithCategory).toHaveBeenCalled());
    expect(await waitFor(() => getByLabelText("2026-09-05 予定1件"))).toBeTruthy();
    expect(getByLabelText("2026-09-06 予定0件")).toBeTruthy();
  });
});

describe("CalendarScreen task detail bottom sheet (from the week timeline)", () => {
  const timelineItem = {
    ...baseItem,
    categoryName: "家事",
    startDate: "2026-09-10T09:00:00",
    endDate: "2026-09-10T10:00:00",
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 10)); // 2026-09-10 (木)
    mockUpdateItem.mockClear().mockResolvedValue(undefined);
    mockDeleteItem.mockClear().mockResolvedValue(undefined);
    mockTagRepository.findTagsForItem.mockReset().mockResolvedValue([]);
    mockItemRepository.findAllWithCategory.mockReset().mockResolvedValue([timelineItem]);
  });
  afterEach(() => jest.useRealTimers());

  const openTimelineAndSheet = async () => {
    const view = render(<CalendarScreen />);
    await waitFor(() => expect(mockItemRepository.findAllWithCategory).toHaveBeenCalled());

    fireEvent.press(view.getByRole("radio", { name: "週間" }));
    fireEvent.press(await waitFor(() => view.getByLabelText("2026-09-10 牛乳を買う 09:00")));
    await waitFor(() => expect(view.getByText("編集する")).toBeTruthy());
    return view;
  };

  it("shows the tapped task's details when a timeline event is pressed", async () => {
    const { getByText, getAllByText } = await openTimelineAndSheet();

    // タイムライン上のイベント自体にも同じテキストがあるため、シート側の
    // タイトルと合わせて2箇所存在することを確認する。
    expect(getAllByText("牛乳を買う").length).toBeGreaterThanOrEqual(2);
    expect(getByText("家事")).toBeTruthy();
    expect(getByText("通知なし")).toBeTruthy();
  });

  it("opens the shared edit modal and closes the bottom sheet when 編集する is pressed", async () => {
    const { getByText, queryByText } = await openTimelineAndSheet();

    fireEvent.press(getByText("編集する"));

    await waitFor(() => expect(getByText("タスクを編集")).toBeTruthy());
    // ボトムシート側の削除リンクは編集モーダルに引き継がれ、閉じているはず。
    expect(queryByText("この予定を削除する")).toBeNull();
  });

  it("preserves the item's existing tags when saved unchanged, even though CalendarScreen's own item list never hydrates tags", async () => {
    // P1回帰: CalendarScreenのfindAllWithCategory()はタグを含まないため、
    // item.tagsに頼るとEditItemModalが常に空配列で初期化し、保存時に既存の
    // タグ付けを消してしまっていた。EditItemModal側でfindTagsForItem()を
    // 呼んで取り直すことで防ぐ。
    mockTagRepository.findTagsForItem.mockResolvedValue([{ id: 1, name: "買い物" }]);
    mockTagRepository.findAll.mockResolvedValue([{ id: 1, name: "買い物" }]);
    const { getByText } = await openTimelineAndSheet();

    fireEvent.press(getByText("編集する"));
    await waitFor(() => expect(getByText("タスクを編集")).toBeTruthy());
    await waitFor(() => expect(mockTagRepository.findTagsForItem).toHaveBeenCalledWith(1));

    fireEvent.press(getByText("保存"));

    await waitFor(() => expect(mockUpdateItem).toHaveBeenCalledTimes(1));
    expect(mockUpdateItem.mock.calls[0][1]).toMatchObject({ tagIds: [1] });
  });

  it("toggles the notification via 通知設定, refreshes the sheet's displayed state, and toggles back correctly on a second press", async () => {
    // reload後は更新済みのnotificationEnabled:trueを返すようにし、シート表示が
    // 実際に追従することを検証する(P2回帰: シートがitemsのスナップショットを
    // 保持したままだと、ここでの表示は古いまま=「通知なし」が残ってしまう)。
    mockItemRepository.findAllWithCategory
      .mockResolvedValueOnce([timelineItem])
      .mockResolvedValueOnce([{ ...timelineItem, notificationEnabled: true }]);
    const { getByText, queryByText } = await openTimelineAndSheet();

    fireEvent.press(getByText("通知設定"));

    await waitFor(() => expect(mockUpdateItem).toHaveBeenCalledWith(1, expect.objectContaining({ notificationEnabled: true })));
    // 変更後は一覧を再読み込みする(onChanged=loadItems)。
    await waitFor(() => expect(mockItemRepository.findAllWithCategory).toHaveBeenCalledTimes(2));
    // 再読み込み後のitemsから最新状態を引き直しているので、表示も更新される。
    await waitFor(() => expect(queryByText("通知なし")).toBeNull());

    // 表示が最新化されているので、もう一度押すと(古いfalseのままではなく)
    // 現在のtrueを見てfalseへ正しく切り替わる。
    fireEvent.press(getByText("通知設定"));
    await waitFor(() => expect(mockUpdateItem).toHaveBeenLastCalledWith(1, expect.objectContaining({ notificationEnabled: false })));
  });

  it("deletes the task after confirming, closing the sheet", async () => {
    jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
      const confirm = buttons?.find((button) => button.text === "削除");
      confirm?.onPress?.();
    });
    const { getByText, queryByText } = await openTimelineAndSheet();

    fireEvent.press(getByText("この予定を削除する"));

    await waitFor(() => expect(mockDeleteItem).toHaveBeenCalledWith(1));
    await waitFor(() => expect(queryByText("編集する")).toBeNull());
  });
});
