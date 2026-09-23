// apps/mobile/src/repositories/sqlite/ItemRepository.ts
import * as SQLite from 'expo-sqlite';
import { DEFAULT_PRIORITY, DEFAULT_REMINDER_MINUTES, IItemRepository, isPriority, isRecurrence, ItemCompletion, Priority, Recurrence, SavedItem, CreateItemDto, UpdateItemDto } from '@milkbox/shared';
import { DEFAULT_COLORS } from '../../constants/colors';

const DEFAULT_TASK_COLOR = DEFAULT_COLORS.task;

export interface ItemCalendarLink {
  itemId: number;
  provider: string;
  externalEventId: string;
}

type SQLiteSavedItemRow = Omit<SavedItem, 'notificationEnabled' | 'notificationMinutesBefore' | 'priority' | 'recurrence'> & {
  notificationEnabled?: boolean | number;
  notificationMinutesBefore?: number | null;
  priority?: Priority | null;
  // DBにはJSON文字列で保存する。recurrenceカラムはpriorityと違いNULL許容(繰り返し無しの表現)。
  recurrence?: string | null;
};

function serializeRecurrence(recurrence: Recurrence | null | undefined): string | null {
  return recurrence ? JSON.stringify(recurrence) : null;
}

function parseRecurrence(value?: string | null): Recurrence | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecurrence(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

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
        color TEXT,
        notificationEnabled INTEGER NOT NULL DEFAULT 1,
        notificationMinutesBefore INTEGER NOT NULL DEFAULT 30,
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
    const colorColumn = tableInfo.find((column) => column.name === 'color');
    const notificationMinutesBeforeColumn = tableInfo.find(
      (column) => column.name === 'notificationMinutesBefore'
    );
    const priorityColumn = tableInfo.find((column) => column.name === 'priority');
    const recurrenceColumn = tableInfo.find((column) => column.name === 'recurrence');

    if (!weekdaysColumn) {
      await this.db.execAsync('ALTER TABLE items ADD COLUMN weekdays TEXT;');
    }

    if (!colorColumn) {
      await this.db.execAsync('ALTER TABLE items ADD COLUMN color TEXT;');
    }

    if (!notificationEnabledColumn) {
      await this.db.execAsync(
        'ALTER TABLE items ADD COLUMN notificationEnabled INTEGER NOT NULL DEFAULT 1;'
      );
    }

    if (!notificationMinutesBeforeColumn) {
      // DBのデフォルト値はDEFAULT_REMINDER_MINUTES(30)とリテラルで一致させている。
      // notificationEnabledカラム定義と同様、DDLへの定数埋め込みは行わない。
      await this.db.execAsync(
        'ALTER TABLE items ADD COLUMN notificationMinutesBefore INTEGER NOT NULL DEFAULT 30;'
      );
    }

    if (!priorityColumn) {
      // DBのデフォルト値はDEFAULT_PRIORITY('medium')とリテラルで一致させている。
      await this.db.execAsync(
        "ALTER TABLE items ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium';"
      );
    }

    if (!recurrenceColumn) {
      // weekdaysと違いこちらはNULL許容(既定値=繰り返し無し)。
      await this.db.execAsync('ALTER TABLE items ADD COLUMN recurrence TEXT;');
    }

    // Migrate older table definitions where categoryId was NOT NULL.
    if (databaseVersion < 1 && categoryIdColumn?.notnull === 1) {
      await this.migrateNullableCategoryId();
    }

    if (databaseVersion < 1) {
      await this.db.execAsync('PRAGMA user_version = 1;');
    }
  }

  async initializeCompletionsTable(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS item_completions (
        itemId INTEGER NOT NULL,
        date TEXT NOT NULL,
        completedAt TEXT NOT NULL,
        PRIMARY KEY (itemId, date)
      );
    `);
  }

  async initializeCalendarLinksTable(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS item_calendar_links (
        itemId INTEGER NOT NULL,
        provider TEXT NOT NULL,
        externalEventId TEXT NOT NULL,
        PRIMARY KEY (itemId, provider)
      );
    `);
  }

  async findCalendarLink(itemId: number, provider: string): Promise<ItemCalendarLink | null> {
    if (!this.db) throw new Error('Database not initialized');
    return (await this.db.getFirstAsync<ItemCalendarLink>(
      'SELECT itemId, provider, externalEventId FROM item_calendar_links WHERE itemId = ? AND provider = ?',
      [itemId, provider]
    )) ?? null;
  }

  async findCalendarLinksByCategoryId(categoryId: number): Promise<ItemCalendarLink[]> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getAllAsync<ItemCalendarLink>(
      'SELECT links.itemId, links.provider, links.externalEventId FROM item_calendar_links links INNER JOIN items ON items.id = links.itemId WHERE items.categoryId = ?',
      [categoryId]
    );
  }

  async findAllCalendarLinks(provider?: string): Promise<ItemCalendarLink[]> {
    if (!this.db) throw new Error('Database not initialized');
    if (provider) {
      return this.db.getAllAsync<ItemCalendarLink>(
        'SELECT itemId, provider, externalEventId FROM item_calendar_links WHERE provider = ?',
        [provider]
      );
    }
    return this.db.getAllAsync<ItemCalendarLink>(
      'SELECT itemId, provider, externalEventId FROM item_calendar_links'
    );
  }

  async saveCalendarLink(link: ItemCalendarLink): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      'INSERT OR REPLACE INTO item_calendar_links (itemId, provider, externalEventId) VALUES (?, ?, ?)',
      [link.itemId, link.provider, link.externalEventId]
    );
  }

  async deleteCalendarLink(itemId: number, provider: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      'DELETE FROM item_calendar_links WHERE itemId = ? AND provider = ?',
      [itemId, provider]
    );
  }

  async setCompletion(itemId: number, date: string, completed: boolean): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    if (completed) {
      // 削除済みタスクへの遅延した完了操作で孤児行を作らない。
      await this.db.runAsync(
        'INSERT OR REPLACE INTO item_completions (itemId, date, completedAt) SELECT id, ?, ? FROM items WHERE id = ?',
        [date, new Date().toISOString(), itemId]
      );
    } else {
      await this.db.runAsync('DELETE FROM item_completions WHERE itemId = ? AND date = ?', [itemId, date]);
    }
  }

  async findCompletionsInRange(startDate: string, endDate: string): Promise<{ itemId: number; date: string }[]> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getAllAsync<{ itemId: number; date: string }>(
      'SELECT itemId, date FROM item_completions WHERE date BETWEEN ? AND ? ORDER BY date, itemId',
      [startDate, endDate]
    );
  }

  async findCompletionsForDate(date: string): Promise<Set<number>> {
    if (!this.db) throw new Error('Database not initialized');
    const rows = await this.db.getAllAsync<Pick<ItemCompletion, 'itemId'>>(
      'SELECT itemId FROM item_completions WHERE date = ?', [date]
    );
    return new Set(rows.map((row) => row.itemId));
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
          color TEXT,
          notificationEnabled INTEGER NOT NULL DEFAULT 1,
          notificationMinutesBefore INTEGER NOT NULL DEFAULT 30,
          priority TEXT NOT NULL DEFAULT 'medium',
          recurrence TEXT,
          FOREIGN KEY (categoryId) REFERENCES categories(id)
        );
      `);
      await this.db.execAsync(`
        INSERT INTO items_new (id, categoryId, text, date, startDate, endDate, weekdays, color, notificationEnabled, notificationMinutesBefore, priority, recurrence)
        SELECT id, categoryId, text, date, startDate, endDate, weekdays, color, notificationEnabled, notificationMinutesBefore, priority, recurrence FROM items;
      `);
      await this.db.execAsync('DROP TABLE IF EXISTS items;');
      await this.db.execAsync('ALTER TABLE items_new RENAME TO items;');
    });
  }

  private normalizeItem(row: SQLiteSavedItemRow): SavedItem {
    return {
      ...row,
      color: row.color ?? DEFAULT_TASK_COLOR,
      notificationEnabled:
        row.notificationEnabled !== false && row.notificationEnabled !== 0,
      notificationMinutesBefore: row.notificationMinutesBefore ?? DEFAULT_REMINDER_MINUTES,
      // DBが壊れて未知の文字列が入っていた場合でも、優先度ドットの色解決(PRIORITY_COLORS)が
      // undefinedにならないよう既定値へフォールバックする。
      priority: isPriority(row.priority) ? row.priority : DEFAULT_PRIORITY,
      recurrence: parseRecurrence(row.recurrence),
    };
  }

  async clear(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.execAsync('DELETE FROM item_completions;');
    await this.db.execAsync('DELETE FROM item_calendar_links;');
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

  async findByCategoryId(categoryId: number): Promise<SavedItem[]> {
    if (!this.db) throw new Error('Database not initialized');
    const rows = await this.db.getAllAsync<SQLiteSavedItemRow>(
      'SELECT * FROM items WHERE categoryId = ? ORDER BY id DESC',
      [categoryId]
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
        items.color,
        items.notificationEnabled,
        items.notificationMinutesBefore,
        items.priority,
        items.recurrence,
        categories.name as categoryName,
        categories.color as categoryColor
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
    const color = data.color ?? DEFAULT_TASK_COLOR;
    const notificationMinutesBefore = data.notificationMinutesBefore ?? DEFAULT_REMINDER_MINUTES;
    const priority = data.priority ?? DEFAULT_PRIORITY;
    const recurrence = data.recurrence;
    let insertedId = 0;

    // tagIdsの紐付け(item_tagsへのINSERT)は、本体のINSERTと同一トランザクションで
    // 行う。別トランザクションに分けると、タグ紐付けだけ失敗/成功して本体との
    // 整合性が崩れる(例: 再試行で重複タスクが作られる)ため。
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      const result = await transaction.runAsync(
        'INSERT INTO items (categoryId, text, date, startDate, endDate, weekdays, color, notificationEnabled, notificationMinutesBefore, priority, recurrence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          data.categoryId ?? null,
          data.text,
          data.date,
          data.startDate ?? null,
          data.endDate ?? null,
          data.weekdays ?? null,
          color,
          notificationEnabled ? 1 : 0,
          notificationMinutesBefore,
          priority,
          serializeRecurrence(recurrence),
        ]
      );
      insertedId = result.lastInsertRowId;

      if (data.tagIds !== undefined) {
        for (const tagId of data.tagIds) {
          await transaction.runAsync(
            'INSERT OR IGNORE INTO item_tags (itemId, tagId) VALUES (?, ?)',
            [insertedId, tagId]
          );
        }
      }
    });

    return {
      id: insertedId,
      categoryId: data.categoryId,
      text: data.text,
      date: data.date,
      startDate: data.startDate,
      endDate: data.endDate,
      weekdays: data.weekdays,
      color,
      notificationEnabled,
      notificationMinutesBefore,
      priority,
      recurrence,
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
    if (data.color !== undefined) {
      updates.push('color = ?');
      params.push(data.color);
    }
    if (data.priority !== undefined) {
      updates.push('priority = ?');
      params.push(data.priority);
    }
    if (data.recurrence !== undefined) {
      updates.push('recurrence = ?');
      params.push(serializeRecurrence(data.recurrence));
    }

    const hasFieldUpdates = updates.length > 0;
    const hasTagUpdate = data.tagIds !== undefined;
    if (!hasFieldUpdates && !hasTagUpdate) return;

    // create()と同じ理由で、本体のUPDATEとitem_tagsの置き換えを同一トランザクションに
    // まとめる。別トランザクションのままだと、本体だけ更新されタグは旧状態、という
    // 部分成功が起こり得る。
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      if (hasFieldUpdates) {
        await transaction.runAsync(
          `UPDATE items SET ${updates.join(', ')} WHERE id = ?`,
          [...params, id]
        );
      }

      if (hasTagUpdate) {
        await transaction.runAsync('DELETE FROM item_tags WHERE itemId = ?', [id]);
        for (const tagId of data.tagIds ?? []) {
          await transaction.runAsync(
            'INSERT OR IGNORE INTO item_tags (itemId, tagId) VALUES (?, ?)',
            [id, tagId]
          );
        }
      }
    });
  }

  async delete(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync('DELETE FROM item_completions WHERE itemId = ?', [id]);
      await transaction.runAsync('DELETE FROM item_calendar_links WHERE itemId = ?', [id]);
      await transaction.runAsync('DELETE FROM item_tags WHERE itemId = ?', [id]);
      await transaction.runAsync('DELETE FROM items WHERE id = ?', [id]);
    });
  }

  async deleteByCategoryId(categoryId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        'DELETE FROM item_completions WHERE itemId IN (SELECT id FROM items WHERE categoryId = ?)', [categoryId]
      );
      await transaction.runAsync(
        'DELETE FROM item_calendar_links WHERE itemId IN (SELECT id FROM items WHERE categoryId = ?)', [categoryId]
      );
      await transaction.runAsync(
        'DELETE FROM item_tags WHERE itemId IN (SELECT id FROM items WHERE categoryId = ?)', [categoryId]
      );
      await transaction.runAsync('DELETE FROM items WHERE categoryId = ?', [categoryId]);
    });
  }

  async clearCategoryByCategoryId(categoryId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('UPDATE items SET categoryId = NULL WHERE categoryId = ?', [categoryId]);
  }
}
