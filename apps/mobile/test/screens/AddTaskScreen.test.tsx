import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AddTaskScreen from "../../src/screens/AddTaskScreen";

const mockCreateItem = jest.fn().mockResolvedValue({ id: 1 });
const mockTagRepository = {
  findAll: jest.fn().mockResolvedValue([]),
  create: jest.fn(),
};
const mockDbManager = {
  categoryRepository: { findAll: jest.fn().mockResolvedValue([]) },
  tagRepository: mockTagRepository,
  createItem: mockCreateItem,
};
jest.mock("../../src/contexts/DatabaseContext", () => ({
  useDatabaseManager: () => ({ dbManager: mockDbManager, notificationsEnabled: true }),
}));

const navigation = { navigate: jest.fn(), popTo: jest.fn() } as unknown as never;

describe("AddTaskScreen priority", () => {
  beforeEach(() => {
    mockCreateItem.mockClear();
    mockTagRepository.findAll.mockClear().mockResolvedValue([]);
    mockTagRepository.create.mockReset();
  });

  it("defaults to medium priority and saves the tapped priority on submit", async () => {
    const { getByText, getByPlaceholderText } = render(
      <AddTaskScreen navigation={navigation} route={{ key: "add-task", name: "AddTask" }} />,
    );
    await waitFor(() => expect(mockDbManager.categoryRepository.findAll).toHaveBeenCalled());

    fireEvent.press(getByText("カテゴリ指定しない"));
    fireEvent.changeText(getByPlaceholderText("テキストを入力"), "牛乳を買う");
    fireEvent.press(getByText("高"));
    fireEvent.press(getByText("タスクを追加する"));

    await waitFor(() => expect(mockCreateItem).toHaveBeenCalledTimes(1));
    expect(mockCreateItem.mock.calls[0][0]).toMatchObject({ text: "牛乳を買う", priority: "high" });
  });

  it("saves the default medium priority when left untouched", async () => {
    const { getByText, getByPlaceholderText } = render(
      <AddTaskScreen navigation={navigation} route={{ key: "add-task", name: "AddTask" }} />,
    );
    await waitFor(() => expect(mockDbManager.categoryRepository.findAll).toHaveBeenCalled());

    fireEvent.press(getByText("カテゴリ指定しない"));
    fireEvent.changeText(getByPlaceholderText("テキストを入力"), "洗濯をする");
    fireEvent.press(getByText("タスクを追加する"));

    await waitFor(() => expect(mockCreateItem).toHaveBeenCalledTimes(1));
    expect(mockCreateItem.mock.calls[0][0]).toMatchObject({ text: "洗濯をする", priority: "medium" });
  });
});

describe("AddTaskScreen tags", () => {
  beforeEach(() => {
    mockCreateItem.mockClear();
    mockTagRepository.findAll.mockClear();
    mockTagRepository.create.mockReset();
  });

  it("toggles an existing tag chip on and saves its id", async () => {
    mockTagRepository.findAll.mockResolvedValue([{ id: 1, name: "買い物" }]);
    const { getByText, getByPlaceholderText } = render(
      <AddTaskScreen navigation={navigation} route={{ key: "add-task", name: "AddTask" }} />,
    );
    await waitFor(() => expect(mockTagRepository.findAll).toHaveBeenCalled());

    fireEvent.press(getByText("カテゴリ指定しない"));
    fireEvent.changeText(getByPlaceholderText("テキストを入力"), "牛乳を買う");
    fireEvent.press(getByText("買い物"));
    fireEvent.press(getByText("タスクを追加する"));

    await waitFor(() => expect(mockCreateItem).toHaveBeenCalledTimes(1));
    expect(mockCreateItem.mock.calls[0][0]).toMatchObject({ tagIds: [1] });
  });

  it("creates a new tag from the input and includes it in the saved tagIds", async () => {
    mockTagRepository.findAll.mockResolvedValue([]);
    mockTagRepository.create.mockResolvedValue({ id: 5, name: "急ぎ" });
    const { getByText, getByPlaceholderText, getByLabelText } = render(
      <AddTaskScreen navigation={navigation} route={{ key: "add-task", name: "AddTask" }} />,
    );
    await waitFor(() => expect(mockTagRepository.findAll).toHaveBeenCalled());

    fireEvent.press(getByText("カテゴリ指定しない"));
    fireEvent.changeText(getByPlaceholderText("テキストを入力"), "牛乳を買う");
    fireEvent.changeText(getByPlaceholderText("新しいタグ"), "急ぎ");
    fireEvent.press(getByLabelText("タグを追加"));
    await waitFor(() => expect(mockTagRepository.create).toHaveBeenCalledWith("急ぎ"));
    fireEvent.press(getByText("タスクを追加する"));

    await waitFor(() => expect(mockCreateItem).toHaveBeenCalledTimes(1));
    expect(mockCreateItem.mock.calls[0][0]).toMatchObject({ tagIds: [5] });
  });
});

describe("AddTaskScreen recurrence", () => {
  beforeEach(() => {
    mockCreateItem.mockClear();
  });

  it("blocks submission with an error when a recurrence is picked but no start date is set", async () => {
    const { getByText, getByPlaceholderText, queryByText } = render(
      <AddTaskScreen navigation={navigation} route={{ key: "add-task", name: "AddTask" }} />,
    );
    await waitFor(() => expect(mockDbManager.categoryRepository.findAll).toHaveBeenCalled());

    fireEvent.press(getByText("カテゴリ指定しない"));
    fireEvent.changeText(getByPlaceholderText("テキストを入力"), "牛乳を買う");
    fireEvent.press(getByText("毎月"));
    fireEvent.press(getByText("タスクを追加する"));

    expect(await waitFor(() => queryByText("繰り返しには開始日を設定してください"))).toBeTruthy();
    expect(mockCreateItem).not.toHaveBeenCalled();
  });

  it("saves the recurrence together with the picked start date", async () => {
    const { getByText, getAllByText, getByPlaceholderText, UNSAFE_getByType } = render(
      <AddTaskScreen navigation={navigation} route={{ key: "add-task", name: "AddTask" }} />,
    );
    await waitFor(() => expect(mockDbManager.categoryRepository.findAll).toHaveBeenCalled());

    fireEvent.press(getByText("カテゴリ指定しない"));
    fireEvent.press(getByText("N日ごと"));
    fireEvent.press(getAllByText("日付")[0]);
    fireEvent(UNSAFE_getByType(DateTimePicker), "change", { type: "set" }, new Date(2026, 8, 20));
    fireEvent.changeText(getByPlaceholderText("テキストを入力"), "牛乳を買う");
    fireEvent.press(getByText("タスクを追加する"));

    await waitFor(() => expect(mockCreateItem).toHaveBeenCalledTimes(1));
    expect(mockCreateItem.mock.calls[0][0]).toMatchObject({
      startDate: "2026-09-20",
      recurrence: { type: "everyNDays", days: 3 },
    });
  });

  it("does not send the category's weekdays when a recurrence is active", async () => {
    jest.mocked(mockDbManager.categoryRepository.findAll).mockResolvedValueOnce([
      { id: 1, name: "掃除", color: "#4CAF50", weekdays: "[1,3,5]" },
    ]);
    const { getByText, getAllByText, UNSAFE_getByType, getByPlaceholderText } = render(
      <AddTaskScreen navigation={navigation} route={{ key: "add-task", name: "AddTask" }} />,
    );
    await waitFor(() => expect(mockDbManager.categoryRepository.findAll).toHaveBeenCalled());

    fireEvent.press(getByText("隔週"));
    fireEvent.press(getAllByText("日付")[0]);
    fireEvent(UNSAFE_getByType(DateTimePicker), "change", { type: "set" }, new Date(2026, 8, 20));
    fireEvent.changeText(getByPlaceholderText("テキストを入力"), "掃除する");
    fireEvent.press(getByText("タスクを追加する"));

    await waitFor(() => expect(mockCreateItem).toHaveBeenCalledTimes(1));
    expect(mockCreateItem.mock.calls[0][0]).toMatchObject({
      weekdays: undefined,
      recurrence: { type: "biweekly" },
    });
  });
});
