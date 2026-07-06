import { useCallback, useState } from "react";
import { Alert } from "react-native";
import type { DatabaseManager } from "../repositories/sqlite/DatabaseManager";
import type { CategorySection } from "../utils/groupByCategory";
import { groupByCategory } from "../utils/groupByCategory";

export interface UseItemFormParams {
  dbManager: DatabaseManager;
}

export interface UseItemFormResult {
  text: string;
  items: CategorySection[];
  setText: React.Dispatch<React.SetStateAction<string>>;
  loadItems: () => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  toggleItemNotification: (id: number, enabled: boolean) => Promise<void>;
  togglingNotificationItemId: number | null;
}

export const useItemForm = ({ dbManager }: UseItemFormParams): UseItemFormResult => {
  const [text, setText] = useState("");
  const [items, setItems] = useState<CategorySection[]>([]);
  const [togglingNotificationItemId, setTogglingNotificationItemId] = useState<number | null>(null);

  const loadItems = useCallback(async () => {
    try {
      const result = await dbManager.itemRepository.findAllWithCategory();
      const grouped = groupByCategory(result);
      setItems(grouped);
    } catch {
      Alert.alert("Error", "Failed to load data");
    }
  }, [dbManager]);

  const deleteItem = useCallback(
    async (id: number) => {
      try {
        await dbManager.deleteItem(id);
        await loadItems();
      } catch {
        Alert.alert("Error", "Failed to delete data");
      }
    },
    [dbManager, loadItems],
  );

  const toggleItemNotification = useCallback(
    async (id: number, enabled: boolean) => {
      if (togglingNotificationItemId !== null) return;

      try {
        setTogglingNotificationItemId(id);
        await dbManager.updateItem(id, { notificationEnabled: enabled });
        await loadItems();
      } catch {
        Alert.alert("Error", "通知設定の更新に失敗しました");
      } finally {
        setTogglingNotificationItemId(null);
      }
    },
    [dbManager, loadItems, togglingNotificationItemId],
  );

  return {
    text,
    items,
    setText,
    loadItems,
    deleteItem,
    toggleItemNotification,
    togglingNotificationItemId,
  };
};
