import type { SQLiteDatabase } from "expo-sqlite";
import { SQLiteTagRepository } from "../../src/repositories/sqlite/TagRepository";

jest.mock("expo-sqlite", () => ({}));

const { DatabaseSync } = process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite");

describe("SQLite tags", () => {
  let db: InstanceType<typeof DatabaseSync>;
  let repository: SQLiteTagRepository;
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
    repository = new SQLiteTagRepository();
    await repository.setDatabase(adapter);
    await repository.initializeTable();
    await repository.initializeItemTagsTable();
    db.exec("CREATE TABLE items (id INTEGER PRIMARY KEY); INSERT INTO items VALUES (1), (2);");
  });
  afterEach(() => db.close());

  it("creates tags and reuses an existing one for the same name instead of duplicating it", async () => {
    const first = await repository.create("買い物");
    const second = await repository.create("買い物");
    expect(second.id).toBe(first.id);
    expect(await repository.findAll()).toEqual([{ id: first.id, name: "買い物" }]);
  });

  it("bulk-reads every item's tags in one query via findAllItemTags", async () => {
    const shopping = await repository.create("買い物");
    const urgent = await repository.create("急ぎ");
    db.exec(`INSERT INTO item_tags (itemId, tagId) VALUES (1, ${shopping.id}), (2, ${shopping.id}), (2, ${urgent.id})`);

    jest.mocked(adapter.getAllAsync).mockClear();
    const rows = await repository.findAllItemTags();
    expect(adapter.getAllAsync).toHaveBeenCalledTimes(1);
    expect(rows).toEqual(expect.arrayContaining([
      { itemId: 1, tag: { id: shopping.id, name: "買い物" } },
      { itemId: 2, tag: { id: shopping.id, name: "買い物" } },
      { itemId: 2, tag: { id: urgent.id, name: "急ぎ" } },
    ]));
  });

  it("atomically removes a deleted tag itself and every item_tags row referencing it", async () => {
    const shopping = await repository.create("買い物");
    db.exec(`INSERT INTO item_tags (itemId, tagId) VALUES (1, ${shopping.id})`);

    await repository.delete(shopping.id);

    expect(await repository.findAll()).toEqual([]);
    expect(await repository.findTagsForItem(1)).toEqual([]);
  });
});
