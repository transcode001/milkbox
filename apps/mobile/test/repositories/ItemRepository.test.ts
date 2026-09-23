import type { SQLiteDatabase } from "expo-sqlite";
import { SQLiteItemRepository } from "../../src/repositories/sqlite/ItemRepository";

jest.mock("expo-sqlite", () => ({}));

const { DatabaseSync } = process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite");

describe("SQLite item completions", () => {
  let db: InstanceType<typeof DatabaseSync>;
  let repository: SQLiteItemRepository;
  let adapter: SQLiteDatabase;
  beforeEach(async () => {
    db = new DatabaseSync(":memory:");
    adapter = {
      withExclusiveTransactionAsync: async (operation: (transaction: SQLiteDatabase) => Promise<void>) => {
        db.exec("BEGIN IMMEDIATE");
        try {
          await operation(adapter);
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      },
      execAsync: jest.fn(async (sql: string) => { db.exec(sql); }),
      // node:sqliteのrun()はlastInsertRowid(小文字d)を返すが、実機のexpo-sqliteは
      // lastInsertRowId(大文字D)。ここで揃えないとcreate()が返すidが常にundefinedになり、
      // 呼び出し側のテストでcreated.idに依存できなくなる。
      runAsync: jest.fn(async (sql: string, params: (string | number | null)[] = []) => {
        const result = db.prepare(sql).run(...params);
        return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
      }),
      getAllAsync: jest.fn(async (sql: string, params: (string | number | null)[] = []) => db.prepare(sql).all(...params)),
      getFirstAsync: jest.fn(async (sql: string, params: (string | number | null)[] = []) => db.prepare(sql).get(...params)),
    } as unknown as SQLiteDatabase;
    repository = new SQLiteItemRepository();
    await repository.setDatabase(adapter);
    db.exec("CREATE TABLE categories (id INTEGER PRIMARY KEY); INSERT INTO categories VALUES (1), (2);");
    await repository.initializeTable();
    await repository.initializeCompletionsTable();
    await repository.initializeCalendarLinksTable();
    db.exec("CREATE TABLE item_tags (itemId INTEGER NOT NULL, tagId INTEGER NOT NULL, PRIMARY KEY (itemId, tagId));");
    db.exec("INSERT INTO items (id, categoryId, text, date) VALUES (1, 1, 'a', '2026-09-13'), (2, 1, 'b', '2026-09-13'), (3, 2, 'c', '2026-09-13');");
  });
  afterEach(() => db.close());

  it("creates the table on a fresh database and preserves records on repeated initialization", async () => {
    await repository.setCompletion(1, "2026-09-13", true);
    await repository.initializeTable();
    await repository.initializeCompletionsTable();
    expect(await repository.findCompletionsForDate("2026-09-13")).toEqual(new Set([1]));
    expect(db.prepare("PRAGMA user_version").get()).toEqual({ user_version: 1 });
  });

  it("adds the table to an existing database without changing items or its version", async () => {
    db.exec("DROP TABLE item_completions");
    await repository.initializeCompletionsTable();
    await repository.initializeCompletionsTable();
    expect(await repository.findCompletionsForDate("2026-09-13")).toEqual(new Set());
    expect(db.prepare("SELECT count(*) AS count FROM items").get()).toEqual({ count: 3 });
    expect(db.prepare("PRAGMA user_version").get()).toEqual({ user_version: 1 });
  });

  it("adds the priority column to an items table that predates it and backfills existing rows to medium", async () => {
    // beforeEach are already migrated (initializeTable() ran before this test body), so this
    // reproduces the pre-migration schema directly: drop the table and recreate it exactly as
    // it looked before the priority column existed, with rows inserted before initializeTable()
    // ever runs against it.
    db.exec("DROP TABLE items");
    db.exec(`
      CREATE TABLE items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        categoryId INTEGER,
        text TEXT NOT NULL,
        date TEXT NOT NULL,
        startDate TEXT,
        endDate TEXT,
        weekdays TEXT,
        color TEXT,
        notificationEnabled INTEGER NOT NULL DEFAULT 1,
        notificationMinutesBefore INTEGER NOT NULL DEFAULT 30
      );
    `);
    db.exec("INSERT INTO items (id, categoryId, text, date) VALUES (10, 1, 'legacy', '2026-09-13');");

    await repository.initializeTable();

    expect(db.prepare("PRAGMA table_info(items)").all().map((column) => (column as { name: string }).name))
      .toContain("priority");
    expect((await repository.findById(10))?.priority).toBe("medium");
  });

  it("falls back to medium when the stored priority is not one of the known values", async () => {
    db.exec("UPDATE items SET priority = 'urgent!!' WHERE id = 1");
    expect((await repository.findById(1))?.priority).toBe("medium");
  });

  it("lets create/update set an explicit priority", async () => {
    const created = await repository.create({ text: "d", date: "2026-09-13", priority: "high" });
    expect(created.priority).toBe("high");

    await repository.update(1, { priority: "low" });
    expect((await repository.findById(1))?.priority).toBe("low");
  });

  it("persists a recurrence rule through create/update and clears it with null", async () => {
    const created = await repository.create({
      text: "d", date: "2026-09-13", startDate: "2026-09-13", recurrence: { type: "monthly" },
    });
    expect(created.recurrence).toEqual({ type: "monthly" });
    expect((await repository.findById(created.id))?.recurrence).toEqual({ type: "monthly" });

    await repository.update(created.id, { recurrence: { type: "everyNDays", days: 5 } });
    expect((await repository.findById(created.id))?.recurrence).toEqual({ type: "everyNDays", days: 5 });

    await repository.update(created.id, { recurrence: null });
    expect((await repository.findById(created.id))?.recurrence).toBeUndefined();
  });

  it("adds the recurrence column to an items table that predates it, defaulting existing rows to no recurrence", async () => {
    db.exec("DROP TABLE items");
    db.exec(`
      CREATE TABLE items (
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
        priority TEXT NOT NULL DEFAULT 'medium'
      );
    `);
    db.exec("INSERT INTO items (id, categoryId, text, date) VALUES (10, 1, 'legacy', '2026-09-13');");

    await repository.initializeTable();

    expect(db.prepare("PRAGMA table_info(items)").all().map((column) => (column as { name: string }).name))
      .toContain("recurrence");
    expect((await repository.findById(10))?.recurrence).toBeUndefined();
  });

  it("falls back to no recurrence when the stored value is corrupted or unrecognized", async () => {
    db.exec("UPDATE items SET recurrence = 'not json' WHERE id = 1");
    expect((await repository.findById(1))?.recurrence).toBeUndefined();

    db.exec(`UPDATE items SET recurrence = '${JSON.stringify({ type: "everyNDays", days: 1 })}' WHERE id = 1`);
    expect((await repository.findById(1))?.recurrence).toBeUndefined();
  });

  it("inserts item_tags rows for the given tagIds in the same transaction as the item insert", async () => {
    const created = await repository.create({ text: "d", date: "2026-09-13", tagIds: [1, 2] });
    expect(db.prepare("SELECT tagId FROM item_tags WHERE itemId = ? ORDER BY tagId").all(created.id))
      .toEqual([{ tagId: 1 }, { tagId: 2 }]);
  });

  it("rolls back the tag associations if the item insert itself fails", async () => {
    await expect(repository.create({ text: null as unknown as string, date: "2026-09-13", tagIds: [1] }))
      .rejects.toThrow();
    expect(db.prepare("SELECT count(*) AS count FROM item_tags").get()).toEqual({ count: 0 });
    expect(db.prepare("SELECT count(*) AS count FROM items").get()).toEqual({ count: 3 });
  });

  it("replaces an item's item_tags rows on update only when tagIds is provided", async () => {
    db.exec("INSERT INTO item_tags (itemId, tagId) VALUES (1, 1), (1, 2)");

    await repository.update(1, { text: "renamed" });
    expect(db.prepare("SELECT tagId FROM item_tags WHERE itemId = 1 ORDER BY tagId").all())
      .toEqual([{ tagId: 1 }, { tagId: 2 }]);

    await repository.update(1, { tagIds: [3] });
    expect(db.prepare("SELECT tagId FROM item_tags WHERE itemId = 1").all()).toEqual([{ tagId: 3 }]);
  });

  it("rolls back the tag replacement if the item update itself fails", async () => {
    db.exec("INSERT INTO item_tags (itemId, tagId) VALUES (1, 1)");

    await expect(repository.update(1, { text: null as unknown as string, tagIds: [2] })).rejects.toThrow();

    expect(db.prepare("SELECT tagId FROM item_tags WHERE itemId = 1").all()).toEqual([{ tagId: 1 }]);
  });

  it("removes item_tags rows when the item is deleted, in the same transaction", async () => {
    db.exec("INSERT INTO item_tags (itemId, tagId) VALUES (1, 1)");
    await repository.delete(1);
    expect(db.prepare("SELECT count(*) AS count FROM item_tags").get()).toEqual({ count: 0 });
  });

  it("removes item_tags rows only for items in a deleted category", async () => {
    db.exec("INSERT INTO item_tags (itemId, tagId) VALUES (1, 1), (2, 2), (3, 3)");
    await repository.deleteByCategoryId(1);
    expect(db.prepare("SELECT itemId FROM item_tags ORDER BY itemId").all()).toEqual([{ itemId: 3 }]);
  });

  it("reads completion occurrences inclusively across a date range in one query", async () => {
    await repository.setCompletion(1, "2026-09-19", true);
    await repository.setCompletion(1, "2026-09-20", true);
    await repository.setCompletion(1, "2026-09-26", true);
    await repository.setCompletion(2, "2026-09-26", true);
    await repository.setCompletion(1, "2026-09-27", true);
    jest.mocked(adapter.getAllAsync).mockClear();
    expect(await repository.findCompletionsInRange("2026-09-20", "2026-09-26")).toEqual([
      { itemId: 1, date: "2026-09-20" }, { itemId: 1, date: "2026-09-26" }, { itemId: 2, date: "2026-09-26" },
    ]);
    expect(adapter.getAllAsync).toHaveBeenCalledTimes(1);
    await repository.setCompletion(1, "2026-09-20", false);
    expect(await repository.findCompletionsInRange("2026-09-20", "2026-09-20")).toEqual([]);
  });

  it("upserts an ISO timestamp, isolates dates, and reads all completed IDs in one query", async () => {
    await repository.setCompletion(1, "2026-09-13", true);
    await repository.setCompletion(1, "2026-09-13", true);
    await repository.setCompletion(2, "2026-09-13", true);
    await repository.setCompletion(1, "2026-09-14", true);
    jest.mocked(adapter.getAllAsync).mockClear();
    expect(await repository.findCompletionsForDate("2026-09-13")).toEqual(new Set([1, 2]));
    expect(adapter.getAllAsync).toHaveBeenCalledTimes(1);
    const rows = db.prepare("SELECT * FROM item_completions").all();
    expect(rows).toHaveLength(3);
    expect(new Date(rows[0].completedAt as string).toISOString()).toBe(rows[0].completedAt);
    await repository.setCompletion(1, "2026-09-13", false);
    await repository.setCompletion(1, "2026-09-13", false);
    expect(await repository.findCompletionsForDate("2026-09-13")).toEqual(new Set([2]));
    expect(await repository.findCompletionsForDate("2026-09-14")).toEqual(new Set([1]));
  });

  it("removes all dates on item deletion and prevents late writes for a deleted item", async () => {
    await repository.setCompletion(1, "2026-09-13", true);
    await repository.setCompletion(1, "2026-09-14", true);
    await repository.delete(1);
    await repository.setCompletion(1, "2026-09-13", true);
    expect(db.prepare("SELECT * FROM item_completions").all()).toEqual([]);
  });

  it("removes category completions while preserving other categories", async () => {
    for (const id of [1, 2, 3]) await repository.setCompletion(id, "2026-09-13", true);
    await repository.deleteByCategoryId(1);
    expect(await repository.findCompletionsForDate("2026-09-13")).toEqual(new Set([3]));
    expect(await repository.findById(1)).toBeNull();
  });

  it("preserves completion history when uncategorizing, and removes it when clearing", async () => {
    await repository.setCompletion(1, "2026-09-13", true);
    await repository.clearCategoryByCategoryId(1);
    expect(await repository.findCompletionsForDate("2026-09-13")).toEqual(new Set([1]));
    await repository.clear();
    expect(await repository.findCompletionsForDate("2026-09-13")).toEqual(new Set());
  });

  it("rolls back completion cleanup if item deletion fails", async () => {
    await repository.setCompletion(1, "2026-09-13", true);
    db.exec("CREATE TRIGGER prevent_delete BEFORE DELETE ON items BEGIN SELECT RAISE(ABORT, 'failed'); END;");
    await expect(repository.delete(1)).rejects.toThrow("failed");
    expect(await repository.findCompletionsForDate("2026-09-13")).toEqual(new Set([1]));
  });

  it("creates calendar links idempotently and removes an item's link in the delete transaction", async () => {
    await repository.saveCalendarLink({ itemId: 1, provider: "device", externalEventId: "event-1" });
    await repository.initializeCalendarLinksTable();
    expect(await repository.findCalendarLink(1, "device")).toEqual({
      itemId: 1,
      provider: "device",
      externalEventId: "event-1",
    });

    await repository.delete(1);
    expect(await repository.findCalendarLink(1, "device")).toBeNull();
  });

  it("removes only the deleted category's calendar links", async () => {
    await repository.saveCalendarLink({ itemId: 1, provider: "device", externalEventId: "event-1" });
    await repository.saveCalendarLink({ itemId: 2, provider: "device", externalEventId: "event-2" });
    await repository.saveCalendarLink({ itemId: 3, provider: "device", externalEventId: "event-3" });

    await repository.deleteByCategoryId(1);

    expect(await repository.findAllCalendarLinks("device")).toEqual([
      { itemId: 3, provider: "device", externalEventId: "event-3" },
    ]);
  });

  it("rolls back calendar-link cleanup when item deletion fails", async () => {
    await repository.saveCalendarLink({ itemId: 1, provider: "device", externalEventId: "event-1" });
    db.exec("CREATE TRIGGER prevent_calendar_item_delete BEFORE DELETE ON items BEGIN SELECT RAISE(ABORT, 'failed'); END;");

    await expect(repository.delete(1)).rejects.toThrow("failed");
    expect(await repository.findCalendarLink(1, "device")).not.toBeNull();
  });
});
