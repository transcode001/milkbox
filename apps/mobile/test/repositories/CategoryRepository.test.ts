import type { SQLiteDatabase } from "expo-sqlite";
import { SQLiteCategoryRepository } from "../../src/repositories/sqlite/CategoryRepository";
import { DEFAULT_CATEGORY_ICON, resolveCategoryIcon } from "../../src/constants/categoryIcons";

jest.mock("expo-sqlite", () => ({}));
const { DatabaseSync } = process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite");

describe("category signatures", () => {
  let db: InstanceType<typeof DatabaseSync>;
  let repository: SQLiteCategoryRepository;
  beforeEach(async () => {
    db = new DatabaseSync(":memory:");
    repository = new SQLiteCategoryRepository();
    await repository.setDatabase({
      execAsync: async (sql: string) => { db.exec(sql); },
      runAsync: async (sql: string, params: (string | number | null)[]) => { const result = db.prepare(sql).run(...params); return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) }; },
      getAllAsync: async (sql: string, params: (string | number | null)[] = []) => db.prepare(sql).all(...params),
      getFirstAsync: async (sql: string, params: (string | number | null)[] = []) => db.prepare(sql).get(...params),
    } as unknown as SQLiteDatabase);
  });
  afterEach(() => db.close());
  it.each([false, true])("adds icon idempotently (existing DB: %s)", async existing => {
    if (existing) db.exec("CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, color TEXT); INSERT INTO categories VALUES (1, '既存', '#123456');");
    await repository.initializeTable();
    await repository.initializeTable();
    const columns = db.prepare("PRAGMA table_info(categories)").all();
    expect(columns.filter(column => column.name === "icon")).toHaveLength(1);
    if (existing) {
      const category = await repository.findById(1);
      expect(category).toMatchObject({ name: "既存", color: "#123456" });
      expect(resolveCategoryIcon(category?.icon)).toBe(DEFAULT_CATEGORY_ICON);
    }
    const category = await repository.create("仕事", undefined, undefined, undefined, "#654321", "briefcase-outline");
    expect(await repository.findById(category.id)).toMatchObject({ icon: "briefcase-outline", color: "#654321" });
    await repository.update(category.id, "生活", undefined, undefined, undefined, undefined, "home-outline");
    await repository.update(category.id, undefined, undefined, undefined, undefined, "#123456");
    await repository.initializeTable();
    expect((await repository.findAll()).find(row => row.id === category.id)).toMatchObject({ icon: "home-outline", color: "#123456" });
  });
  it("falls back for absent or unknown icons", () => {
    expect(resolveCategoryIcon()).toBe(DEFAULT_CATEGORY_ICON);
    expect(resolveCategoryIcon(null)).toBe(DEFAULT_CATEGORY_ICON);
    expect(resolveCategoryIcon("invalid")).toBe(DEFAULT_CATEGORY_ICON);
  });
});
