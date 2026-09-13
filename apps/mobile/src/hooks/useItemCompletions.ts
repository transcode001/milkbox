import { useCallback, useRef, useState } from "react";
import { Alert, AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useDatabaseManager } from "../contexts/DatabaseContext";
import { createDateKey } from "../utils/calendarDates";

// date 未指定のホームは、フォーカス・復帰・日付変更時に今日の分を読み直す。
export function useItemCompletions(date?: string) {
  const { dbManager } = useDatabaseManager();
  const [state, setState] = useState<{ date: string; ids: Set<number> } | null>(null);
  const [busy, setBusy] = useState(false);
  const writing = useRef(false);
  const generation = useRef(0);
  const currentDate = date ?? createDateKey(new Date());

  useFocusEffect(useCallback(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    // フォーカス復帰・AppState復帰・日付変更のたびに自動で再読み込みされるため、
    // 読み込みが失敗し続けると復帰イベントの回数分だけAlertが積み重なってしまう。
    // 失敗が続く間は最初の1回だけ通知し、成功したらリセットする。
    let hasAlerted = false;
    const load = async () => {
      const request = ++generation.current;
      const key = date ?? createDateKey(new Date());
      try {
        const ids = await dbManager.itemRepository.findCompletionsForDate(key);
        if (active && request === generation.current) {
          setState({ date: key, ids });
          hasAlerted = false;
        }
      } catch {
        if (active && request === generation.current) {
          setState(null);
          if (!hasAlerted) {
            hasAlerted = true;
            Alert.alert("エラー", "完了状態の読み込みに失敗しました");
          }
        }
      }
    };
    const scheduleMidnight = () => {
      if (date) return;
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(() => {
        void load();
        scheduleMidnight();
      }, next.getTime() - now.getTime() + 20);
    };
    setState(null);
    void load();
    scheduleMidnight();
    const subscription = AppState.addEventListener("change", (value) => {
      if (value === "active") {
        void load();
        clearTimeout(timer);
        scheduleMidnight();
      }
    });
    return () => {
      active = false;
      generation.current++;
      clearTimeout(timer);
      subscription.remove();
    };
  }, [date, dbManager]));

  const toggleCompletion = async (itemId: number) => {
    const key = date ?? createDateKey(new Date());
    if (writing.current || state?.date !== key) return;
    writing.current = true;
    setBusy(true);
    const request = ++generation.current;
    try {
      await dbManager.itemRepository.setCompletion(itemId, key, !state.ids.has(itemId));
      const ids = await dbManager.itemRepository.findCompletionsForDate(key);
      if (request === generation.current) setState({ date: key, ids });
    } catch {
      Alert.alert("エラー", "完了状態の更新に失敗しました");
    } finally {
      writing.current = false;
      setBusy(false);
    }
  };

  return {
    completedIds: state?.date === currentDate ? state.ids : new Set<number>(),
    disabled: busy || state?.date !== currentDate,
    toggleCompletion,
  };
}
