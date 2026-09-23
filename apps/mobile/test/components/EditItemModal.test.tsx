import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { EditItemModal } from "../../src/components/EditItemModal";
import type { SavedItem } from "@milkbox/shared";

const baseItem: SavedItem = {
  id: 1,
  text: "牛乳を買う",
  date: "2026-09-13",
  color: "#7986CB",
  notificationEnabled: false,
  notificationMinutesBefore: 30,
  priority: "high",
};

const mockUpdateItem = jest.fn().mockResolvedValue(undefined);
const mockTagRepository = {
  findAll: jest.fn().mockResolvedValue([]),
  findAllItemTags: jest.fn().mockResolvedValue([]),
  findTagsForItem: jest.fn().mockResolvedValue([]),
  create: jest.fn(),
};
const mockDbManager = {
  tagRepository: mockTagRepository,
  updateItem: mockUpdateItem,
};
jest.mock("../../src/contexts/DatabaseContext", () => ({
  useDatabaseManager: () => ({ dbManager: mockDbManager }),
}));

describe("EditItemModal", () => {
  beforeEach(() => {
    mockUpdateItem.mockClear().mockResolvedValue(undefined);
    mockTagRepository.findAll.mockReset().mockResolvedValue([]);
    mockTagRepository.findAllItemTags.mockReset().mockResolvedValue([]);
    mockTagRepository.findTagsForItem.mockReset().mockResolvedValue([]);
  });

  it("is not visible when item is null", () => {
    const { queryByText } = render(
      <EditItemModal item={null} onClose={jest.fn()} onSaved={jest.fn()} />,
    );
    expect(queryByText("タスクを編集")).toBeNull();
  });

  it("pre-fills the form from the given item and saves the unchanged values", async () => {
    const onClose = jest.fn();
    const onSaved = jest.fn().mockResolvedValue(undefined);
    const { getByText, getByDisplayValue } = render(
      <EditItemModal item={baseItem} onClose={onClose} onSaved={onSaved} />,
    );

    await waitFor(() => expect(getByText("タスクを編集")).toBeTruthy());
    expect(getByDisplayValue("牛乳を買う")).toBeTruthy();
    expect(getByText("高")).toBeTruthy(); // 優先度セグメントの選択中ラベル

    fireEvent.press(getByText("保存"));

    await waitFor(() => expect(mockUpdateItem).toHaveBeenCalledTimes(1));
    expect(mockUpdateItem).toHaveBeenCalledWith(1, expect.objectContaining({
      text: "牛乳を買う",
      priority: "high",
    }));
    expect(onClose).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
  });

  it("re-initializes the form when a different item is passed in", async () => {
    const { getByText, rerender, getByDisplayValue } = render(
      <EditItemModal item={baseItem} onClose={jest.fn()} onSaved={jest.fn()} />,
    );
    await waitFor(() => expect(getByText("タスクを編集")).toBeTruthy());

    const otherItem: SavedItem = { ...baseItem, id: 2, text: "ゴミ出し", priority: "low" };
    rerender(<EditItemModal item={otherItem} onClose={jest.fn()} onSaved={jest.fn()} />);

    await waitFor(() => expect(getByDisplayValue("ゴミ出し")).toBeTruthy());
  });

  it("blocks saving with an alert when the text is emptied out", async () => {
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const { getByText, getByDisplayValue } = render(
      <EditItemModal item={baseItem} onClose={jest.fn()} onSaved={jest.fn()} />,
    );
    await waitFor(() => expect(getByText("タスクを編集")).toBeTruthy());

    fireEvent.changeText(getByDisplayValue("牛乳を買う"), "   ");
    fireEvent.press(getByText("保存"));

    expect(Alert.alert).toHaveBeenCalledWith("エラー", "内容を入力してください");
    expect(mockUpdateItem).not.toHaveBeenCalled();
  });

  it("closes without saving when cancel is pressed", async () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <EditItemModal item={baseItem} onClose={onClose} onSaved={jest.fn()} />,
    );
    await waitFor(() => expect(getByText("タスクを編集")).toBeTruthy());

    fireEvent.press(getByText("キャンセル"));

    expect(onClose).toHaveBeenCalled();
    expect(mockUpdateItem).not.toHaveBeenCalled();
  });
});
