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
      runAsync: jest.fn(async (sql: string, params: (string | number | null)[] = []) => db.prepare(sql).run(...params)),
      getAllAsync: jest.fn(async (sql: string, params: (string | number | null)[] = []) => db.prepare(sql).all(...params)),
      getFirstAsync: jest.fn(async (sql: string, params: (string | number | null)[] = []) => db.prepare(sql).get(...params)),
    } as unknown as SQLiteDatabase;
    repository = new SQLiteItemRepository();
    await repository.setDatabase(adapter);
    db.exec("CREATE TABLE categories (id INTEGER PRIMARY KEY); INSERT INTO categories VALUES (1), (2);");
    await repository.initializeTable();
    await repository.initializeCompletionsTable();
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
});
