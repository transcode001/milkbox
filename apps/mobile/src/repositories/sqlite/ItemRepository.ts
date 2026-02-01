// apps/mobile/src/repositories/sqlite/ItemRepository.ts
import * as SQLite from 'expo-sqlite';
import { IItemRepository, SavedItem, CreateItemDto, UpdateItemDto } from '@milkbox/shared';

export class SQLiteItemRepository implements IItemRepository {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync('milkbox.db');
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        date TEXT NOT NULL
      );
    `);
  }

  async findAll(): Promise<SavedItem[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync<SavedItem>(
      'SELECT * FROM items ORDER BY id DESC'
    );
  }

  async findById(id: number): Promise<SavedItem | null> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.getFirstAsync<SavedItem>(
      'SELECT * FROM items WHERE id = ?',
      [id]
    );
    return result || null;
  }

  async create(text: string): Promise<SavedItem> {
    if (!this.db) throw new Error('Database not initialized');
    const date = new Date().toISOString();
    const result = await this.db.runAsync(
      'INSERT INTO items (text, date) VALUES (?, ?)',
      [text, date]
    );
    return {
      id: result.lastInsertRowId,
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
}