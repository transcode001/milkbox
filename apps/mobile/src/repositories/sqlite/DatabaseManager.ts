import * as SQLite from 'expo-sqlite';
import type { CreateItemDto, SavedItem, UpdateItemDto } from '@milkbox/shared';
import { SQLiteItemRepository } from './ItemRepository';
import { SQLiteCategoryRepository } from './CategoryRepository';
import { SQLiteTagRepository } from './TagRepository';
import {
  cancelAllTaskNotificationsAsync,
  cancelTaskNotificationsAsync,
  scheduleTaskNotificationsAsync,
} from '../../services/notifications';
import {
  deleteAllTaskCalendarEventsAsync,
  deleteTaskCalendarEventAsync,
  syncTaskCalendarAsync,
} from '../../services/calendarSync';

export class DatabaseManager {
  private db: SQLite.SQLiteDatabase | null = null;
  public itemRepository: SQLiteItemRepository;
  public categoryRepository: SQLiteCategoryRepository;
  public tagRepository: SQLiteTagRepository;

  constructor() {
    this.itemRepository = new SQLiteItemRepository();
    this.categoryRepository = new SQLiteCategoryRepository();
    this.tagRepository = new SQLiteTagRepository();
  }

  private scheduleItemNotifications(item: SavedItem): void {
    void scheduleTaskNotificationsAsync(item).catch((error: unknown) => {
      console.warn(`Notification scheduling failed for item ${item.id}`, error);
    });
  }

  private syncItemCalendar(item: SavedItem): void {
    void this.withCategoryName(item).then((enrichedItem) =>
      syncTaskCalendarAsync(enrichedItem, this.itemRepository)
    ).catch((error: unknown) => {
      console.warn(`Calendar sync failed for item ${item.id}`, error);
    });
  }

  private async withCategoryName(item: SavedItem): Promise<SavedItem> {
    if (!item.categoryId) return item;
    const category = await this.categoryRepository.findById(item.categoryId);
    return category ? { ...item, categoryName: category.name } : item;
  }

  async initialize(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync('milkbox.db');
    
    await this.itemRepository.setDatabase(this.db);
    await this.categoryRepository.setDatabase(this.db);
    await this.tagRepository.setDatabase(this.db);

    // カテゴリテーブルを先に作成（外部キー制約のため）
    await this.categoryRepository.initializeTable();
    await this.itemRepository.initializeTable();
    await this.itemRepository.initializeCompletionsTable();
    await this.itemRepository.initializeCalendarLinksTable();
    await this.tagRepository.initializeTable();
    await this.tagRepository.initializeItemTagsTable();
  }

  async clearAll(): Promise<void> {
    await cancelAllTaskNotificationsAsync();
    await deleteAllTaskCalendarEventsAsync(this.itemRepository);
    // アイテムを先に削除（外部キー制約のため）
    await this.itemRepository.clear();
    await this.categoryRepository.clear();
    await this.tagRepository.clear();
  }

  async createItem(data: CreateItemDto): Promise<SavedItem> {
    // tagIdsの紐付けはitemRepository.create()内で本体のINSERTと同一トランザクションに
    // まとめている(部分成功を避けるため)。ここでの findTagsForItem は確定後の読み出しだけ。
    const item = await this.itemRepository.create(data);
    if (data.tagIds !== undefined) {
      item.tags = await this.tagRepository.findTagsForItem(item.id);
    }
    this.scheduleItemNotifications(item);
    this.syncItemCalendar(item);
    return item;
  }

  // 注意: タスク編集機能を実装する場合、itemRepository.update() を直接呼ばずに
  // 必ず DatabaseManager.updateItem() を使用すること。
  // UpdateItemDto は text・notificationEnabled・startDate・endDate・weekdays・categoryId・color・priority・tagIds を更新できる。
  // tagIdsの置き換えもitemRepository.update()内で本体のUPDATEと同一トランザクションに
  // まとめている。updateItem() は更新後に通知の再スケジュール（scheduleTaskNotificationsAsync）まで行う。
  async updateItem(id: number, data: UpdateItemDto): Promise<void> {
    await this.itemRepository.update(id, data);
    const item = await this.itemRepository.findById(id);
    if (item) {
      this.scheduleItemNotifications(item);
      this.syncItemCalendar(item);
    } else {
      await cancelTaskNotificationsAsync(id);
    }
  }

  // 注意: カテゴリ編集機能を実装する場合、categoryRepository.update() を直接呼ばずに
  // 必ず DatabaseManager.updateCategory() を使用すること。
  // updateCategory() はカテゴリ配下の全タスクの通知を再スケジュールする。
  async updateCategory(
    id: number,
    name?: string,
    weekdays?: string | null,
    startDate?: string | null,
    endDate?: string | null,
    color?: string,
    icon?: string,
  ): Promise<void> {
    await this.categoryRepository.update(id, name, weekdays, startDate, endDate, color, icon);

    const targets = await this.itemRepository.findByCategoryId(id);
    // 通知APIが応答を返さない環境（Expo Goを含む）でも、カテゴリ編集の保存を
    // ブロックしないよう再スケジュールはバックグラウンドで継続する。
    targets.forEach((item) => {
      this.scheduleItemNotifications(item);
      this.syncItemCalendar(item);
    });
  }

  async deleteItem(id: number): Promise<void> {
    await cancelTaskNotificationsAsync(id);
    await deleteTaskCalendarEventAsync(id, this.itemRepository);
    // item_tagsの削除はitemRepository.delete()がitems/item_completions/item_calendar_links
    // と同一トランザクションで行う。ここで別途呼ぶと、後続のdelete()が失敗した時に
    // タグ紐付けだけ消えたタスクが残ってしまう。
    await this.itemRepository.delete(id);
  }

  async deleteItemsByCategoryId(categoryId: number): Promise<void> {
    const categoryItems = await this.itemRepository.findByCategoryId(categoryId);

    for (const item of categoryItems) {
      await cancelTaskNotificationsAsync(item.id);
      await deleteTaskCalendarEventAsync(item.id, this.itemRepository);
    }
    // item_tagsの削除はitemRepository.deleteByCategoryId()が同一トランザクションで行う。
    await this.itemRepository.deleteByCategoryId(categoryId);
  }

  async syncTaskNotifications(): Promise<void> {
    const items = await this.itemRepository.findAll();

    for (const item of items) {
      try {
        await scheduleTaskNotificationsAsync(item);
      } catch (error) {
        console.warn(`Notification sync failed for item ${item.id}`, error);
      }
    }
  }

  async syncTaskCalendars(): Promise<void> {
    const items = await this.itemRepository.findAll();
    for (const item of items) {
      try {
        await syncTaskCalendarAsync(await this.withCategoryName(item), this.itemRepository);
      } catch (error) {
        console.warn(`Calendar sync failed for item ${item.id}`, error);
      }
    }
  }
}
