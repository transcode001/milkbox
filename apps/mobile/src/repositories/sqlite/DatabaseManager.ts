import * as SQLite from 'expo-sqlite';
import type { CreateItemDto, SavedItem, UpdateItemDto } from '@milkbox/shared';
import { SQLiteItemRepository } from './ItemRepository';
import { SQLiteCategoryRepository } from './CategoryRepository';
import {
  cancelAllTaskNotificationsAsync,
  cancelTaskNotificationsAsync,
  scheduleTaskNotificationsAsync,
  shouldScheduleNotification,
} from '../../services/notifications';

export class DatabaseManager {
  private db: SQLite.SQLiteDatabase | null = null;
  public itemRepository: SQLiteItemRepository;
  public categoryRepository: SQLiteCategoryRepository;

  constructor() {
    this.itemRepository = new SQLiteItemRepository();
    this.categoryRepository = new SQLiteCategoryRepository();
  }

  async initialize(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync('milkbox.db');
    
    await this.itemRepository.setDatabase(this.db);
    await this.categoryRepository.setDatabase(this.db);
    
    // カテゴリテーブルを先に作成（外部キー制約のため）
    await this.categoryRepository.initializeTable();
    await this.itemRepository.initializeTable();
  }

  async clearAll(): Promise<void> {
    await cancelAllTaskNotificationsAsync();
    // アイテムを先に削除（外部キー制約のため）
    await this.itemRepository.clear();
    await this.categoryRepository.clear();
  }

  async createItem(data: CreateItemDto): Promise<SavedItem> {
    const item = await this.itemRepository.create(data);
    await scheduleTaskNotificationsAsync(item);
    return item;
  }

  // 注意: タスク編集機能を実装する場合、itemRepository.update() を直接呼ばずに
  // 必ず DatabaseManager.updateItem() を使用すること。
  // updateItem() は更新後に通知の再スケジュール（scheduleTaskNotificationsAsync）まで行う。
  async updateItem(id: number, data: UpdateItemDto): Promise<void> {
    await this.itemRepository.update(id, data);
    const item = await this.itemRepository.findById(id);
    if (item) {
      await scheduleTaskNotificationsAsync(item);
    }
  }

  async deleteItem(id: number): Promise<void> {
    await cancelTaskNotificationsAsync(id);
    await this.itemRepository.delete(id);
  }

  async deleteItemsByCategoryId(categoryId: number): Promise<void> {
    const items = await this.itemRepository.findAll();
    const categoryItems = items.filter((item) => item.categoryId === categoryId);

    for (const item of categoryItems) {
      await cancelTaskNotificationsAsync(item.id);
    }
    await this.itemRepository.deleteByCategoryId(categoryId);
  }

  async syncTaskNotifications(): Promise<void> {
    const items = await this.itemRepository.findAll();
    const targets = items.filter((item) => shouldScheduleNotification(item));

    await Promise.all(
      targets.map((item) => scheduleTaskNotificationsAsync(item)),
    );
  }
}
