import * as SQLite from 'expo-sqlite';

export interface Category {
  id: number;
  name: string;
}

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
        name TEXT NOT NULL UNIQUE
      );
    `);
    
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

  async create(name: string): Promise<Category> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.runAsync(
      'INSERT INTO categories (name) VALUES (?)',
      [name]
    );
    return {
      id: result.lastInsertRowId,
      name: name,
    };
  }

  async update(id: number, name: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      'UPDATE categories SET name = ? WHERE id = ?',
      [name, id]
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
