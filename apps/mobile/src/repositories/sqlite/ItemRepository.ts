// apps/mobile/src/repositories/sqlite/ItemRepository.ts
import * as SQLite from 'expo-sqlite';
import { DEFAULT_REMINDER_MINUTES, IItemRepository, SavedItem, CreateItemDto, UpdateItemDto } from '@milkbox/shared';

type SQLiteSavedItemRow = Omit<SavedItem, 'notificationEnabled' | 'notificationMinutesBefore'> & {
  notificationEnabled?: boolean | number;
  notificationMinutesBefore?: number | null;
};

export class SQLiteItemRepository implements IItemRepository {
  private db: SQLite.SQLiteDatabase | null = null;

  async setDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
    this.db = db;
  }

  async initializeTable(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const databaseVersion = await this.getDatabaseVersion();

    if (databaseVersion < 1) {
      await this.recoverInterruptedCategoryIdMigration();
    }

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        categoryId INTEGER,
        text TEXT NOT NULL,
        date TEXT NOT NULL,
        startDate TEXT,
        endDate TEXT,
        weekdays TEXT,
        notificationEnabled INTEGER NOT NULL DEFAULT 1,
        notificationMinutesBefore INTEGER NOT NULL DEFAULT ${DEFAULT_REMINDER_MINUTES},
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
    const notificationEnabledColumn = tableInfo.find((column) => column.name === 'notificationEnabled');
    const notificationMinutesBeforeColumn = tableInfo.find(
      (column) => column.name === 'notificationMinutesBefore'
    );

    if (!weekdaysColumn) {
      await this.db.execAsync('ALTER TABLE items ADD COLUMN weekdays TEXT;');
    }

    if (!notificationEnabledColumn) {
      await this.db.execAsync(
        'ALTER TABLE items ADD COLUMN notificationEnabled INTEGER NOT NULL DEFAULT 1;'
      );
    }

    if (!notificationMinutesBeforeColumn) {
      await this.db.execAsync(
        `ALTER TABLE items ADD COLUMN notificationMinutesBefore INTEGER NOT NULL DEFAULT ${DEFAULT_REMINDER_MINUTES};`
      );
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
          notificationEnabled INTEGER NOT NULL DEFAULT 1,
          notificationMinutesBefore INTEGER NOT NULL DEFAULT ${DEFAULT_REMINDER_MINUTES},
          FOREIGN KEY (categoryId) REFERENCES categories(id)
        );
      `);
      await this.db.execAsync(`
        INSERT INTO items_new (id, categoryId, text, date, startDate, endDate, weekdays, notificationEnabled, notificationMinutesBefore)
        SELECT id, categoryId, text, date, startDate, endDate, weekdays, notificationEnabled, notificationMinutesBefore FROM items;
      `);
      await this.db.execAsync('DROP TABLE IF EXISTS items;');
      await this.db.execAsync('ALTER TABLE items_new RENAME TO items;');
    });
  }

  private normalizeItem(row: SQLiteSavedItemRow): SavedItem {
    return {
      ...row,
      notificationEnabled:
        row.notificationEnabled !== false && row.notificationEnabled !== 0,
      notificationMinutesBefore: row.notificationMinutesBefore ?? DEFAULT_REMINDER_MINUTES,
    };
  }

  async clear(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.execAsync('DROP TABLE IF EXISTS items');
    await this.initializeTable();
  }

  async findAll(): Promise<SavedItem[]> {
    if (!this.db) throw new Error('Database not initialized');
    const rows = await this.db.getAllAsync<SQLiteSavedItemRow>(
      'SELECT * FROM items ORDER BY id DESC'
    );
    return rows.map((row) => this.normalizeItem(row));
  }

  async findAllWithCategory(): Promise<SavedItem[]> {
    if (!this.db) throw new Error('Database not initialized');
    const rows = await this.db.getAllAsync<SQLiteSavedItemRow>(`
      SELECT 
        items.id,
        items.categoryId,
        items.text,
        items.date,
        items.startDate,
        items.endDate,
        items.weekdays,
        items.notificationEnabled,
        items.notificationMinutesBefore,
        categories.name as categoryName
      FROM items
      LEFT JOIN categories ON items.categoryId = categories.id
      ORDER BY categories.name, items.id DESC
    `);
    return rows.map((row) => this.normalizeItem(row));
  }

  async findById(id: number): Promise<SavedItem | null> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.getFirstAsync<SQLiteSavedItemRow>(
      'SELECT * FROM items WHERE id = ?',
      [id]
    );
    return result ? this.normalizeItem(result) : null;
  }

  async create(data: CreateItemDto): Promise<SavedItem> {
    if (!this.db) throw new Error('Database not initialized');
    const notificationEnabled = data.notificationEnabled !== false;
    const notificationMinutesBefore = data.notificationMinutesBefore ?? DEFAULT_REMINDER_MINUTES;
    const result = await this.db.runAsync(
      'INSERT INTO items (categoryId, text, date, startDate, endDate, weekdays, notificationEnabled, notificationMinutesBefore) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        data.categoryId ?? null,
        data.text,
        data.date,
        data.startDate ?? null,
        data.endDate ?? null,
        data.weekdays ?? null,
        notificationEnabled ? 1 : 0,
        notificationMinutesBefore,
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
      notificationEnabled,
      notificationMinutesBefore,
    };
  }

  async update(id: number, data: UpdateItemDto): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.text !== undefined) {
      updates.push('text = ?');
      params.push(data.text);
    }
    if (data.notificationEnabled !== undefined) {
      updates.push('notificationEnabled = ?');
      params.push(data.notificationEnabled ? 1 : 0);
    }
    if (data.notificationMinutesBefore !== undefined) {
      updates.push('notificationMinutesBefore = ?');
      params.push(data.notificationMinutesBefore);
    }
    if (data.startDate !== undefined) {
      updates.push('startDate = ?');
      params.push(data.startDate ?? null);
    }
    if (data.endDate !== undefined) {
      updates.push('endDate = ?');
      params.push(data.endDate ?? null);
    }
    if (data.weekdays !== undefined) {
      updates.push('weekdays = ?');
      params.push(data.weekdays ?? null);
    }
    if (data.categoryId !== undefined) {
      updates.push('categoryId = ?');
      params.push(data.categoryId ?? null);
    }
    if (updates.length === 0) return;

    await this.db.runAsync(
      `UPDATE items SET ${updates.join(', ')} WHERE id = ?`,
      [...params, id]
    );
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
