import * as SQLite from 'expo-sqlite';
import type { Category } from '@milkbox/shared';

export class SQLiteCategoryRepository {
  private db: SQLite.SQLiteDatabase | null = null;

  async setDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
    this.db = db;
  }

  async initializeTable(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        weekdays TEXT,
        startDate TEXT,
        endDate TEXT
      );
    `);

    const tableInfo = await this.db.getAllAsync<{ name: string }>(
      'PRAGMA table_info(categories);'
    );
    const columnNames = tableInfo.map((col) => col.name);

    if (!columnNames.includes('weekdays')) {
      await this.db.execAsync('ALTER TABLE categories ADD COLUMN weekdays TEXT;');
    }
    if (!columnNames.includes('startDate')) {
      await this.db.execAsync('ALTER TABLE categories ADD COLUMN startDate TEXT;');
    }
    if (!columnNames.includes('endDate')) {
      await this.db.execAsync('ALTER TABLE categories ADD COLUMN endDate TEXT;');
    }
  }

  async findAll(): Promise<Category[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync<Category>(
      'SELECT * FROM categories ORDER BY id ASC'
    );
  }

  async findById(id: number): Promise<Category | null> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.getFirstAsync<Category>(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );
    return result || null;
  }

  async create(
    name: string,
    weekdays?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<Category> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.runAsync(
      'INSERT INTO categories (name, weekdays, startDate, endDate) VALUES (?, ?, ?, ?)',
      [name, weekdays ?? null, startDate ?? null, endDate ?? null]
    );
    return {
      id: result.lastInsertRowId,
      name,
      weekdays,
      startDate,
      endDate,
    };
  }

  async update(
    id: number,
    name?: string,
    weekdays?: string | null,
    startDate?: string | null,
    endDate?: string | null,
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (weekdays !== undefined) {
      updates.push('weekdays = ?');
      params.push(weekdays);
    }
    if (startDate !== undefined) {
      updates.push('startDate = ?');
      params.push(startDate);
    }
    if (endDate !== undefined) {
      updates.push('endDate = ?');
      params.push(endDate);
    }
    if (updates.length === 0) return;

    await this.db.runAsync(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
      [...params, id]
    );
  }

  async delete(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  }

  async clear(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.execAsync('DROP TABLE IF EXISTS categories');
    await this.initializeTable();
  }
}
