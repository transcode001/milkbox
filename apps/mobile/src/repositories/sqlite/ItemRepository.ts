// apps/mobile/src/repositories/sqlite/ItemRepository.ts
import * as SQLite from 'expo-sqlite';
import { IItemRepository, SavedItem, CreateItemDto, UpdateItemDto } from '@milkbox/shared';

export class SQLiteItemRepository implements IItemRepository {
  private db: SQLite.SQLiteDatabase | null = null;

  async setDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
    this.db = db;
  }

  async initializeTable(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.recoverInterruptedCategoryIdMigration();

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        categoryId INTEGER,
        text TEXT NOT NULL,
        date TEXT NOT NULL,
        startDate TEXT,
        endDate TEXT,
        weekdays TEXT,
        FOREIGN KEY (categoryId) REFERENCES categories(id)
      );
    `);

    type TableInfoRow = {
      name: string;
      notnull: number;
    };

    const tableInfo = await this.db.getAllAsync<TableInfoRow>('PRAGMA table_info(items);');
    const categoryIdColumn = tableInfo.find((column) => column.name === 'categoryId');
    const weekdaysColumn = tableInfo.find((column) => column.name === 'weekdays');
    const databaseVersion = await this.getDatabaseVersion();

    if (!weekdaysColumn) {
      await this.db.execAsync('ALTER TABLE items ADD COLUMN weekdays TEXT;');
    }

    // Migrate older table definitions where categoryId was NOT NULL.
    if (databaseVersion < 1 && categoryIdColumn?.notnull === 1) {
      await this.migrateNullableCategoryId();
    }

    if (databaseVersion < 1) {
      await this.db.execAsync('PRAGMA user_version = 1;');
    }
  }

  private async getDatabaseVersion(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    const row = await this.db.getFirstAsync<{ user_version: number }>(
      'PRAGMA user_version;'
    );
    return row?.user_version ?? 0;
  }

  private async recoverInterruptedCategoryIdMigration(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('items', 'items_new')"
    );
    const tableNames = new Set(rows.map((row) => row.name));

    if (!tableNames.has('items') && tableNames.has('items_new')) {
      await this.db.execAsync('ALTER TABLE items_new RENAME TO items;');
    } else if (tableNames.has('items_new')) {
      await this.db.execAsync('DROP TABLE IF EXISTS items_new;');
    }
  }

  private async runInTransaction(operation: () => Promise<void>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync('BEGIN IMMEDIATE TRANSACTION;');
    try {
      await operation();
      await this.db.execAsync('COMMIT;');
    } catch (error) {
      try {
        await this.db.execAsync('ROLLBACK;');
      } catch (rollbackError) {
        console.warn('Failed to rollback item migration', rollbackError);
      }
      throw error;
    }
  }

  private async migrateNullableCategoryId(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.runInTransaction(async () => {
      if (!this.db) throw new Error('Database not initialized');

      await this.db.execAsync('DROP TABLE IF EXISTS items_new;');
      await this.db.execAsync(`
        CREATE TABLE items_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          categoryId INTEGER,
          text TEXT NOT NULL,
          date TEXT NOT NULL,
          startDate TEXT,
          endDate TEXT,
          weekdays TEXT,
          FOREIGN KEY (categoryId) REFERENCES categories(id)
        );
      `);
      await this.db.execAsync(`
        INSERT INTO items_new (id, categoryId, text, date, startDate, endDate, weekdays)
        SELECT id, categoryId, text, date, startDate, endDate, weekdays FROM items;
      `);
      await this.db.execAsync('DROP TABLE items;');
      await this.db.execAsync('ALTER TABLE items_new RENAME TO items;');
      await this.db.execAsync('PRAGMA user_version = 1;');
    });
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
        items.startDate,
        items.endDate,
        items.weekdays,
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

  async create(data: CreateItemDto): Promise<SavedItem> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.runAsync(
      'INSERT INTO items (categoryId, text, date, startDate, endDate, weekdays) VALUES (?, ?, ?, ?, ?, ?)',
      [
        data.categoryId ?? null,
        data.text,
        data.date,
        data.startDate ?? null,
        data.endDate ?? null,
        data.weekdays ?? null,
      ]
    );
    return {
      id: result.lastInsertRowId,
      categoryId: data.categoryId,
      text: data.text,
      date: data.date,
      startDate: data.startDate,
      endDate: data.endDate,
      weekdays: data.weekdays,
    };
  }

  async update(id: number, data: UpdateItemDto): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    if (data.text !== undefined) {
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

  async clearCategoryByCategoryId(categoryId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('UPDATE items SET categoryId = NULL WHERE categoryId = ?', [categoryId]);
  }
}
