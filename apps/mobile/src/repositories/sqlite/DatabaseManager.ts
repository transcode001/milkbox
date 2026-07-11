import * as SQLite from 'expo-sqlite';
import type { CreateItemDto, SavedItem, UpdateItemDto } from '@milkbox/shared';
import { SQLiteItemRepository } from './ItemRepository';
import { SQLiteCategoryRepository } from './CategoryRepository';
import {
  cancelAllTaskNotificationsAsync,
  cancelTaskNotificationsAsync,
  scheduleTaskNotificationsAsync,
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
    try {
      await scheduleTaskNotificationsAsync(item);
    } catch (error) {
      console.warn(`Notification scheduling failed for item ${item.id}`, error);
    }
    return item;
  }

  // 注意: タスク編集機能を実装する場合、itemRepository.update() を直接呼ばずに
  // 必ず DatabaseManager.updateItem() を使用すること。
  // UpdateItemDto は text・notificationEnabled・startDate・endDate・weekdays・categoryId を更新できる。
  // updateItem() は更新後に通知の再スケジュール（scheduleTaskNotificationsAsync）まで行う。
  async updateItem(id: number, data: UpdateItemDto): Promise<void> {
    await this.itemRepository.update(id, data);
    const item = await this.itemRepository.findById(id);
    if (item) {
      try {
        await scheduleTaskNotificationsAsync(item);
      } catch (error) {
        console.warn(`Notification scheduling failed for item ${item.id}`, error);
      }
    } else {
      await cancelTaskNotificationsAsync(id);
    }
  }

  // 注意: カテゴリ編集機能を実装する場合、categoryRepository.update() を直接呼ばずに
  // 必ず DatabaseManager.updateCategory() を使用すること。
  // updateCategory() はカテゴリ配下の全サブタスクの通知を再スケジュールする。
  async updateCategory(
    id: number,
    name?: string,
    weekdays?: string | null,
    startDate?: string | null,
    endDate?: string | null,
  ): Promise<void> {
    await this.categoryRepository.update(id, name, weekdays, startDate, endDate);

    const items = await this.itemRepository.findAll();
    const targets = items.filter((item) => item.categoryId === id);
    await Promise.all(targets.map((item) => scheduleTaskNotificationsAsync(item)));
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

    for (const item of items) {
      try {
        await scheduleTaskNotificationsAsync(item);
      } catch (error) {
        console.warn(`Notification sync failed for item ${item.id}`, error);
      }
    }
  }
}
