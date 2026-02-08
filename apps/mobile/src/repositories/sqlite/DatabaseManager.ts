import * as SQLite from 'expo-sqlite';
import { SQLiteItemRepository } from './ItemRepository';
import { SQLiteCategoryRepository } from './CategoryRepository';

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
    // アイテムを先に削除（外部キー制約のため）
    await this.itemRepository.clear();
    await this.categoryRepository.clear();
  }
}
