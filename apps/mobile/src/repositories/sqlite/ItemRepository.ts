// apps/mobile/src/repositories/sqlite/ItemRepository.ts
import * as SQLite from 'expo-sqlite';
import { IItemRepository, SavedItem, CreateItemDto, UpdateItemDto } from '@milkbox/shared';

export class SQLiteItemRepository implements IItemRepository {
  initialize(): Promise<void> {
    throw new Error('Method not implemented.');
  }
  private db: SQLite.SQLiteDatabase | null = null;

  async setDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
    this.db = db;
  }

  async initializeTable(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        categoryId INTEGER NOT NULL,
        text TEXT NOT NULL,
        date TEXT NOT NULL,
        FOREIGN KEY (categoryId) REFERENCES categories(id)
      );
    `);
  }

  async clear(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.execAsync('DROP TABLE IF EXISTS items');
    await this.initializeTable();
  }

  async findAll(): Promise<SavedItem[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync<SavedItem>(
      'SELECT * FROM items ORDER BY id DESC'
    );
  }

  async findAllWithCategory(): Promise<SavedItem[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync<SavedItem>(`
      SELECT 
        items.id,
        items.categoryId,
        items.text,
        items.date,
        categories.name as categoryName
      FROM items
      LEFT JOIN categories ON items.categoryId = categories.id
      ORDER BY categories.name, items.id DESC
    `);
  }

  async findById(id: number): Promise<SavedItem | null> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.getFirstAsync<SavedItem>(
      'SELECT * FROM items WHERE id = ?',
      [id]
    );
    return result || null;
  }

  async create(categoryId: number, text: string): Promise<SavedItem> {
    if (!this.db) throw new Error('Database not initialized');
    const date = new Date().toISOString();
    const result = await this.db.runAsync(
      'INSERT INTO items (categoryId, text, date) VALUES (?, ?, ?)',
      [categoryId, text, date]
    );
    return {
      id: result.lastInsertRowId,
      categoryId,
      text: text,
      date,
    };
  }

  async update(id: number, data: UpdateItemDto): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    if (data.text) {
      await this.db.runAsync(
        'UPDATE items SET text = ? WHERE id = ?',
        [data.text, id]
      );
    }
  }

  async delete(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM items WHERE id = ?', [id]);
  }

  async deleteByCategoryId(categoryId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM items WHERE categoryId = ?', [categoryId]);
  }
}