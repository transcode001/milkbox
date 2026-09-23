import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import HomeScreen from "../../src/screens/HomeScreen";
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
  date: "2026-09-13",
  color: "#7986CB",
  notificationEnabled: false,
  notificationMinutesBefore: 30,
  priority: "high",
};

const mockUpdateItem = jest.fn().mockResolvedValue(undefined);
const mockItemRepository = {
  findAllWithCategory: jest.fn().mockResolvedValue([baseItem]),
  findCompletionsForDate: jest.fn().mockResolvedValue(new Set()),
  findCompletionsInRange: jest.fn().mockResolvedValue([]),
  setCompletion: jest.fn().mockResolvedValue(undefined),
};
const mockTagRepository = {
  findAll: jest.fn().mockResolvedValue([]),
  findAllItemTags: jest.fn().mockResolvedValue([]),
  findTagsForItem: jest.fn().mockResolvedValue([]),
  create: jest.fn(),
};
const mockDbManager = {
  itemRepository: mockItemRepository,
  categoryRepository: { findAll: jest.fn().mockResolvedValue([]) },
  tagRepository: mockTagRepository,
  updateItem: mockUpdateItem,
  deleteItem: jest.fn().mockResolvedValue(undefined),
};
jest.mock("../../src/contexts/DatabaseContext", () => ({
  useDatabaseManager: () => ({ dbManager: mockDbManager, notificationsEnabled: true }),
}));

const navigation = { navigate: jest.fn() } as unknown as never;

describe("HomeScreen priority editing", () => {
  beforeEach(() => {
    mockUpdateItem.mockClear();
  });

  it("opens the editor with the item's current priority and saves a changed one", async () => {
    const { getByText } = render(<HomeScreen navigation={navigation} route={{ key: "home", name: "Home" }} />);

    await waitFor(() => expect(mockItemRepository.findAllWithCategory).toHaveBeenCalled());
    fireEvent.press(await waitFor(() => getByText("牛乳を買う")));

    expect(await waitFor(() => getByText("タスクを編集"))).toBeTruthy();

    fireEvent.press(getByText("低"));
    fireEvent.press(getByText("保存"));

    await waitFor(() => expect(mockUpdateItem).toHaveBeenCalledTimes(1));
    expect(mockUpdateItem.mock.calls[0][1]).toMatchObject({ priority: "low" });
  });

  it("keeps the item's existing priority when the editor is saved untouched", async () => {
    const { getByText } = render(<HomeScreen navigation={navigation} route={{ key: "home", name: "Home" }} />);

    await waitFor(() => expect(mockItemRepository.findAllWithCategory).toHaveBeenCalled());
    fireEvent.press(await waitFor(() => getByText("牛乳を買う")));
    await waitFor(() => getByText("タスクを編集"));

    fireEvent.press(getByText("保存"));

    await waitFor(() => expect(mockUpdateItem).toHaveBeenCalledTimes(1));
    expect(mockUpdateItem.mock.calls[0][1]).toMatchObject({ priority: "high" });
  });
});

describe("HomeScreen tag editing", () => {
  beforeEach(() => {
    mockUpdateItem.mockClear();
    mockTagRepository.findAllItemTags.mockReset().mockResolvedValue([{ itemId: 1, tag: { id: 1, name: "買い物" } }]);
    mockTagRepository.findTagsForItem.mockReset().mockResolvedValue([{ id: 1, name: "買い物" }]);
    mockTagRepository.findAll.mockReset().mockResolvedValue([
      { id: 1, name: "買い物" },
      { id: 2, name: "急ぎ" },
    ]);
    mockTagRepository.create.mockReset();
  });

  it("shows the item's tags in the list and pre-selects them when editing", async () => {
    const { getByText, getAllByText } = render(
      <HomeScreen navigation={navigation} route={{ key: "home", name: "Home" }} />,
    );

    await waitFor(() => expect(mockTagRepository.findAllItemTags).toHaveBeenCalled());
    // 一覧行のタグchipと編集モーダル内のタグ選択chipで「買い物」が重複するため、
    // ここでは一覧側に少なくとも1つ表示されていることだけを確認する。
    await waitFor(() => expect(getAllByText("買い物").length).toBeGreaterThan(0));

    fireEvent.press(await waitFor(() => getByText("牛乳を買う")));
    await waitFor(() => getByText("タスクを編集"));

    fireEvent.press(getByText("保存"));

    await waitFor(() => expect(mockUpdateItem).toHaveBeenCalledTimes(1));
    expect(mockUpdateItem.mock.calls[0][1]).toMatchObject({ tagIds: [1] });
  });

  it("adds an existing tag and a newly created one on top of the pre-selected tag", async () => {
    const { getByText, getByPlaceholderText, getByLabelText } = render(
      <HomeScreen navigation={navigation} route={{ key: "home", name: "Home" }} />,
    );

    await waitFor(() => expect(mockTagRepository.findAllItemTags).toHaveBeenCalled());
    fireEvent.press(await waitFor(() => getByText("牛乳を買う")));
    await waitFor(() => getByText("タスクを編集"));

    fireEvent.press(getByText("急ぎ"));
    mockTagRepository.create.mockResolvedValue({ id: 3, name: "特売" });
    fireEvent.changeText(getByPlaceholderText("新しいタグ"), "特売");
    fireEvent.press(getByLabelText("タグを追加"));
    await waitFor(() => expect(mockTagRepository.create).toHaveBeenCalledWith("特売"));
    fireEvent.press(getByText("保存"));

    await waitFor(() => expect(mockUpdateItem).toHaveBeenCalledTimes(1));
    expect(mockUpdateItem.mock.calls[0][1].tagIds).toEqual(expect.arrayContaining([1, 2, 3]));
  });
});

describe("HomeScreen recurrence editing", () => {
  beforeEach(() => {
    mockUpdateItem.mockClear();
    mockItemRepository.findAllWithCategory.mockReset().mockResolvedValue([baseItem]);
  });

  it("shows the item's recurrence label in the list and keeps it when saved untouched", async () => {
    mockItemRepository.findAllWithCategory.mockResolvedValue([
      { ...baseItem, startDate: "2026-09-13T09:00:00", recurrence: { type: "monthly" } },
    ]);
    const { getByText } = render(<HomeScreen navigation={navigation} route={{ key: "home", name: "Home" }} />);

    await waitFor(() => expect(mockItemRepository.findAllWithCategory).toHaveBeenCalled());
    expect(await waitFor(() => getByText("毎月"))).toBeTruthy();

    fireEvent.press(getByText("牛乳を買う"));
    await waitFor(() => getByText("タスクを編集"));
    fireEvent.press(getByText("保存"));

    await waitFor(() => expect(mockUpdateItem).toHaveBeenCalledTimes(1));
    expect(mockUpdateItem.mock.calls[0][1]).toMatchObject({ recurrence: { type: "monthly" } });
  });

  it("blocks saving with an alert when a recurrence is picked but the item has no start date", async () => {
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const { getByText } = render(<HomeScreen navigation={navigation} route={{ key: "home", name: "Home" }} />);

    await waitFor(() => expect(mockItemRepository.findAllWithCategory).toHaveBeenCalled());
    fireEvent.press(getByText("牛乳を買う"));
    await waitFor(() => getByText("タスクを編集"));

    fireEvent.press(getByText("隔週"));
    fireEvent.press(getByText("保存"));

    expect(Alert.alert).toHaveBeenCalledWith("エラー", "繰り返しには開始日を設定してください");
    expect(mockUpdateItem).not.toHaveBeenCalled();
  });

  it("clears the item's existing weekday recurrence when switching it to a new recurrence type", async () => {
    mockItemRepository.findAllWithCategory.mockResolvedValue([
      { ...baseItem, weekdays: "[1,3,5]", startDate: "2026-09-13T09:00:00" },
    ]);
    const { getByText } = render(<HomeScreen navigation={navigation} route={{ key: "home", name: "Home" }} />);

    await waitFor(() => expect(mockItemRepository.findAllWithCategory).toHaveBeenCalled());
    fireEvent.press(getByText("牛乳を買う"));
    await waitFor(() => getByText("タスクを編集"));

    fireEvent.press(getByText("隔週"));
    fireEvent.press(getByText("保存"));

    await waitFor(() => expect(mockUpdateItem).toHaveBeenCalledTimes(1));
    expect(mockUpdateItem.mock.calls[0][1]).toMatchObject({
      weekdays: null,
      recurrence: { type: "biweekly" },
    });
  });
});

// SectionList内の描画順を確認するため、レンダー結果からテキストだけを
// 出現順に連結して取り出す。同じテキストが複数出ない前提で使う。
function flattenText(node: unknown): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join("");
  if (typeof node === "object" && "children" in node) {
    return flattenText((node as { children: unknown }).children);
  }
  return "";
}

describe("HomeScreen search", () => {
  beforeEach(() => {
    mockTagRepository.findAllItemTags.mockReset().mockResolvedValue([
      { itemId: 3, tag: { id: 1, name: "急ぎ" } },
    ]);
    mockItemRepository.findAllWithCategory.mockReset().mockResolvedValue([
      { ...baseItem, id: 1, text: "牛乳を買う", categoryId: 1, categoryName: "買い物" },
      { ...baseItem, id: 2, text: "洗濯する", categoryId: 1, categoryName: "買い物" },
      { ...baseItem, id: 3, text: "掃除する", categoryId: 2, categoryName: "家事" },
    ]);
  });

  it("filters items by text and hides categories left with no matches", async () => {
    const { getByText, getByPlaceholderText, queryByText } = render(
      <HomeScreen navigation={navigation} route={{ key: "home", name: "Home" }} />,
    );
    await waitFor(() => expect(mockItemRepository.findAllWithCategory).toHaveBeenCalled());
    await waitFor(() => getByText("牛乳を買う"));

    fireEvent.changeText(getByPlaceholderText("タスクやタグを検索"), "洗濯");

    await waitFor(() => expect(queryByText("牛乳を買う")).toBeNull());
    expect(getByText("洗濯する")).toBeTruthy();
    expect(queryByText("掃除する")).toBeNull();
    // 「家事」カテゴリは該当タスクが無くなるのでヘッダーごと消える。
    expect(queryByText("家事")).toBeNull();
  });

  it("filters items by tag name", async () => {
    const { getByText, getByPlaceholderText, queryByText } = render(
      <HomeScreen navigation={navigation} route={{ key: "home", name: "Home" }} />,
    );
    await waitFor(() => expect(mockItemRepository.findAllWithCategory).toHaveBeenCalled());
    await waitFor(() => getByText("牛乳を買う"));

    fireEvent.changeText(getByPlaceholderText("タスクやタグを検索"), "急ぎ");

    await waitFor(() => expect(getByText("掃除する")).toBeTruthy());
    expect(queryByText("牛乳を買う")).toBeNull();
    expect(queryByText("洗濯する")).toBeNull();
  });

  it("reveals matches inside a collapsed category while searching", async () => {
    const { getByText, getByPlaceholderText, queryByText } = render(
      <HomeScreen navigation={navigation} route={{ key: "home", name: "Home" }} />,
    );
    await waitFor(() => expect(mockItemRepository.findAllWithCategory).toHaveBeenCalled());
    await waitFor(() => getByText("家事"));

    fireEvent.press(getByText("家事"));
    expect(queryByText("掃除する")).toBeNull();

    fireEvent.changeText(getByPlaceholderText("タスクやタグを検索"), "掃除");

    await waitFor(() => expect(getByText("掃除する")).toBeTruthy());
  });

  it("clears the query and restores the full list", async () => {
    const { getByText, getByPlaceholderText, getByLabelText, queryByText } = render(
      <HomeScreen navigation={navigation} route={{ key: "home", name: "Home" }} />,
    );
    await waitFor(() => expect(mockItemRepository.findAllWithCategory).toHaveBeenCalled());
    fireEvent.changeText(getByPlaceholderText("タスクやタグを検索"), "洗濯");
    await waitFor(() => expect(queryByText("牛乳を買う")).toBeNull());

    fireEvent.press(getByLabelText("検索をクリア"));

    await waitFor(() => expect(getByText("牛乳を買う")).toBeTruthy());
    expect(getByText("掃除する")).toBeTruthy();
  });
});

describe("HomeScreen sort", () => {
  it("keeps insertion order for 追加順 (the default)", async () => {
    mockItemRepository.findAllWithCategory.mockResolvedValue([
      { ...baseItem, id: 1, text: "Bタスク", categoryId: 1, categoryName: "買い物", priority: "low" },
      { ...baseItem, id: 2, text: "Aタスク", categoryId: 1, categoryName: "買い物", priority: "high" },
    ]);
    const { getByText, toJSON } = render(
      <HomeScreen navigation={navigation} route={{ key: "home", name: "Home" }} />,
    );
    await waitFor(() => expect(mockItemRepository.findAllWithCategory).toHaveBeenCalled());
    await waitFor(() => getByText("Bタスク"));

    const text = flattenText(toJSON());
    expect(text.indexOf("Bタスク")).toBeLessThan(text.indexOf("Aタスク"));
  });

  it("reorders items by priority (high before low) when 優先度順 is selected", async () => {
    mockItemRepository.findAllWithCategory.mockResolvedValue([
      { ...baseItem, id: 1, text: "Bタスク", categoryId: 1, categoryName: "買い物", priority: "low" },
      { ...baseItem, id: 2, text: "Aタスク", categoryId: 1, categoryName: "買い物", priority: "high" },
    ]);
    const { getByText, getByLabelText, toJSON } = render(
      <HomeScreen navigation={navigation} route={{ key: "home", name: "Home" }} />,
    );
    await waitFor(() => expect(mockItemRepository.findAllWithCategory).toHaveBeenCalled());
    await waitFor(() => getByText("Bタスク"));

    fireEvent.press(getByLabelText("並び替え"));
    fireEvent.press(getByText("優先度順"));

    await waitFor(() => {
      const text = flattenText(toJSON());
      expect(text.indexOf("Aタスク")).toBeLessThan(text.indexOf("Bタスク"));
    });
  });

  it("reorders items alphabetically when 名前順 is selected", async () => {
    mockItemRepository.findAllWithCategory.mockResolvedValue([
      { ...baseItem, id: 1, text: "Bタスク", categoryId: 1, categoryName: "買い物" },
      { ...baseItem, id: 2, text: "Aタスク", categoryId: 1, categoryName: "買い物" },
    ]);
    const { getByText, getByLabelText, toJSON } = render(
      <HomeScreen navigation={navigation} route={{ key: "home", name: "Home" }} />,
    );
    await waitFor(() => expect(mockItemRepository.findAllWithCategory).toHaveBeenCalled());
    await waitFor(() => getByText("Bタスク"));

    fireEvent.press(getByLabelText("並び替え"));
    fireEvent.press(getByText("名前順"));

    await waitFor(() => {
      const text = flattenText(toJSON());
      expect(text.indexOf("Aタスク")).toBeLessThan(text.indexOf("Bタスク"));
    });
  });
});
