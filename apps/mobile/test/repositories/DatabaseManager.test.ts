import { DatabaseManager } from "../../src/repositories/sqlite/DatabaseManager";

jest.mock("../../src/services/notifications", () => ({
  scheduleTaskNotificationsAsync: jest.fn().mockResolvedValue([]),
  cancelTaskNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  cancelAllTaskNotificationsAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../src/services/calendarSync", () => ({
  syncTaskCalendarAsync: jest.fn().mockResolvedValue(undefined),
  deleteTaskCalendarEventAsync: jest.fn().mockResolvedValue(undefined),
  deleteAllTaskCalendarEventsAsync: jest.fn().mockResolvedValue(undefined),
}));

// タスク本体とタグの紐付けを同一トランザクションにするため、その関連付け自体は
// itemRepository.create()/update()の中で行う(ItemRepository.test.tsで検証済み)。
// ここではDatabaseManagerがtagIdsを正しく素通しし、作成結果へタグを添えることだけを見る。
describe("DatabaseManager item/tag pass-through", () => {
  let dbManager: DatabaseManager;
  const baseItem = {
    id: 1, text: "牛乳を買う", date: "2026-09-13", color: "#7986CB",
    notificationEnabled: false, notificationMinutesBefore: 30, priority: "medium" as const,
  };

  beforeEach(() => {
    dbManager = new DatabaseManager();
    dbManager.itemRepository = {
      // createItem()はitem.tagsをこの戻り値へ直接代入するため、テスト間でbaseItemを
      // 使い回すと前のテストの代入が漏れ出す。呼び出しごとに新しいオブジェクトを返す。
      create: jest.fn().mockImplementation(async () => ({ ...baseItem })),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(baseItem),
      findByCategoryId: jest.fn().mockResolvedValue([baseItem, { ...baseItem, id: 2 }]),
      delete: jest.fn().mockResolvedValue(undefined),
      deleteByCategoryId: jest.fn().mockResolvedValue(undefined),
    } as unknown as DatabaseManager["itemRepository"];
    dbManager.categoryRepository = {
      findById: jest.fn().mockResolvedValue(null),
    } as unknown as DatabaseManager["categoryRepository"];
    dbManager.tagRepository = {
      findTagsForItem: jest.fn().mockResolvedValue([{ id: 9, name: "急ぎ" }]),
    } as unknown as DatabaseManager["tagRepository"];
  });

  it("forwards tagIds to itemRepository.create() and attaches the resulting tags to the returned item", async () => {
    const item = await dbManager.createItem({ text: "牛乳を買う", date: "2026-09-13", tagIds: [9] });
    expect(dbManager.itemRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ tagIds: [9] }),
    );
    expect(dbManager.tagRepository.findTagsForItem).toHaveBeenCalledWith(1);
    expect(item.tags).toEqual([{ id: 9, name: "急ぎ" }]);
  });

  it("does not look up tags when tagIds is not provided on create", async () => {
    const item = await dbManager.createItem({ text: "牛乳を買う", date: "2026-09-13" });
    expect(dbManager.tagRepository.findTagsForItem).not.toHaveBeenCalled();
    expect(item.tags).toBeUndefined();
  });

  it("forwards tagIds to itemRepository.update() untouched", async () => {
    await dbManager.updateItem(1, { tagIds: [9] });
    expect(dbManager.itemRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({ tagIds: [9] }));
  });
});
