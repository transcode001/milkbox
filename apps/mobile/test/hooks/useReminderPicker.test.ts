import { act, renderHook } from "@testing-library/react-native";
import { NONE_REMINDER_VALUE } from "@milkbox/shared";
import { useReminderPicker } from "../../src/hooks/useReminderPicker";

describe("useReminderPicker", () => {
  // 実際に起きた不具合: 通知を無効化してから再度有効化すると、元々設定していた
  // タイミングではなくデフォルト値にリセットされていた。
  it("restores the originally selected timing after disabling and re-enabling", () => {
    const { result } = renderHook(() => useReminderPicker(60));

    expect(result.current.notificationMinutesBefore).toBe(60);
    expect(result.current.notificationEnabled).toBe(true);

    act(() => {
      result.current.toggleReminderEnabled(); // 無効化
    });

    expect(result.current.notificationMinutesBefore).toBe(NONE_REMINDER_VALUE);
    expect(result.current.notificationEnabled).toBe(false);

    act(() => {
      result.current.toggleReminderEnabled(); // 再度有効化
    });

    expect(result.current.notificationMinutesBefore).toBe(60);
    expect(result.current.notificationEnabled).toBe(true);
  });

  it("restores the most recently selected timing, not just the initial one", () => {
    const { result } = renderHook(() => useReminderPicker(30));

    act(() => {
      result.current.selectReminderMinutes(120); // 2時間前に変更
    });
    act(() => {
      result.current.toggleReminderEnabled(); // 無効化
    });
    act(() => {
      result.current.toggleReminderEnabled(); // 再度有効化
    });

    expect(result.current.notificationMinutesBefore).toBe(120);
  });

  it("falls back to the default timing when re-enabling an item that never had a real value", () => {
    const { result } = renderHook(() => useReminderPicker(NONE_REMINDER_VALUE));

    expect(result.current.notificationEnabled).toBe(false);

    act(() => {
      result.current.toggleReminderEnabled(); // 有効化
    });

    expect(result.current.notificationMinutesBefore).toBeGreaterThan(0);
  });

  describe("getPersistableMinutesBefore", () => {
    // 実際に起きた不具合そのもの: 無効のまま保存する画面(HomeScreenの編集モーダル)が
    // notificationMinutesBeforeをそのままDBへ渡すとNONE_REMINDER_VALUEで上書きしてしまい、
    // 一覧のベルアイコンで直接切り替えた時と挙動が食い違っていた。
    it("returns the real timing (not the sentinel) while disabled, for callers that must not erase it", () => {
      const { result } = renderHook(() => useReminderPicker(60));

      act(() => {
        result.current.toggleReminderEnabled(); // 無効化
      });

      expect(result.current.notificationMinutesBefore).toBe(NONE_REMINDER_VALUE);
      expect(result.current.getPersistableMinutesBefore()).toBe(60);
    });

    it("returns the current timing while enabled", () => {
      const { result } = renderHook(() => useReminderPicker(60));

      expect(result.current.getPersistableMinutesBefore()).toBe(60);
    });
  });

  describe("resetReminder", () => {
    // openItemEditorが編集対象のアイテムを開き直す時に使う経路。無効なアイテムを
    // 開いても、実際に保存されていたタイミング(この場合60)を復元用に控えること。
    it("seeds the restorable timing from a currently-disabled item's real stored value", () => {
      const { result } = renderHook(() => useReminderPicker());

      act(() => {
        result.current.resetReminder(60, false); // 無効・実タイミングは60
      });

      expect(result.current.notificationEnabled).toBe(false);
      expect(result.current.getPersistableMinutesBefore()).toBe(60);

      act(() => {
        result.current.toggleReminderEnabled(); // 再度有効化
      });

      expect(result.current.notificationMinutesBefore).toBe(60);
    });

    it("seeds the default timing when the item never had a real value", () => {
      const { result } = renderHook(() => useReminderPicker());

      act(() => {
        result.current.resetReminder(NONE_REMINDER_VALUE, false);
      });

      act(() => {
        result.current.toggleReminderEnabled();
      });

      expect(result.current.notificationMinutesBefore).toBeGreaterThan(0);
    });
  });

  it("closes the reminder list when selecting a timing", () => {
    const { result } = renderHook(() => useReminderPicker());

    act(() => {
      result.current.setIsReminderListOpen(true);
    });
    act(() => {
      result.current.selectReminderMinutes(15);
    });

    expect(result.current.notificationMinutesBefore).toBe(15);
    expect(result.current.isReminderListOpen).toBe(false);
  });
});
