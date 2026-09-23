// apps/mobile/src/repositories/sqlite/TagRepository.ts
import * as SQLite from 'expo-sqlite';
import type { ITagRepository, Tag } from '@milkbox/shared';

export class SQLiteTagRepository implements ITagRepository {
  private db: SQLite.SQLiteDatabase | null = null;

  async setDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
    this.db = db;
  }

  async initializeTable(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );
    `);
  }

  async initializeItemTagsTable(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS item_tags (
        itemId INTEGER NOT NULL,
        tagId INTEGER NOT NULL,
        PRIMARY KEY (itemId, tagId)
      );
    `);
  }

  async findAll(): Promise<Tag[]> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getAllAsync<Tag>('SELECT id, name FROM tags ORDER BY name ASC');
  }

  async create(name: string): Promise<Tag> {
    if (!this.db) throw new Error('Database not initialized');
    const trimmed = name.trim();
    // 同名タグの重複作成を防ぐため、既にあれば作らずにそれを返す(find-or-create)。
    await this.db.runAsync('INSERT OR IGNORE INTO tags (name) VALUES (?)', [trimmed]);
    const tag = await this.db.getFirstAsync<Tag>('SELECT id, name FROM tags WHERE name = ?', [trimmed]);
    if (!tag) throw new Error('Failed to create tag');
    return tag;
  }

  async delete(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync('DELETE FROM item_tags WHERE tagId = ?', [id]);
      await transaction.runAsync('DELETE FROM tags WHERE id = ?', [id]);
    });
  }

  async findTagsForItem(itemId: number): Promise<Tag[]> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getAllAsync<Tag>(
      'SELECT tags.id, tags.name FROM tags INNER JOIN item_tags ON item_tags.tagId = tags.id WHERE item_tags.itemId = ? ORDER BY tags.name ASC',
      [itemId]
    );
  }

  async findAllItemTags(): Promise<{ itemId: number; tag: Tag }[]> {
    if (!this.db) throw new Error('Database not initialized');
    const rows = await this.db.getAllAsync<{ itemId: number; id: number; name: string }>(
      'SELECT item_tags.itemId as itemId, tags.id as id, tags.name as name FROM item_tags INNER JOIN tags ON tags.id = item_tags.tagId ORDER BY tags.name ASC'
    );
    return rows.map((row) => ({ itemId: row.itemId, tag: { id: row.id, name: row.name } }));
  }

  async clear(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.execAsync('DELETE FROM item_tags;');
    await this.db.execAsync('DROP TABLE IF EXISTS tags');
    await this.initializeTable();
  }
}
