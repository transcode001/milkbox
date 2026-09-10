import { DEFAULT_REMINDER_MINUTES, NONE_REMINDER_VALUE, resolveReminderMinutesToRestore } from "@milkbox/shared";

describe("resolveReminderMinutesToRestore", () => {
  it("returns the value unchanged when it is a real timing", () => {
    expect(resolveReminderMinutesToRestore(60)).toBe(60);
  });

  // 実際に起きた不具合の根本原因: 通知を無効化する時にnotificationMinutesBeforeを
  // NONE_REMINDER_VALUEで上書きすると、この関数が復元できる値を失ってしまう。
  // 無効化そのものではこの関数を経由せず元の値を素通りさせ、値が本当に
  // NONE_REMINDER_VALUE(一度も設定したことがない)の時だけデフォルトへ
  // フォールバックするのが正しい。
  it("falls back to the default only when the value is the sentinel", () => {
    expect(resolveReminderMinutesToRestore(NONE_REMINDER_VALUE)).toBe(DEFAULT_REMINDER_MINUTES);
  });

  it("passes through zero (開始時間) without treating it as unset", () => {
    expect(resolveReminderMinutesToRestore(0)).toBe(0);
  });
});
