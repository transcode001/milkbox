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
}

export const useItemForm = ({ dbManager }: UseItemFormParams): UseItemFormResult => {
  const [text, setText] = useState("");
  const [items, setItems] = useState<CategorySection[]>([]);

  const loadItems = useCallback(async () => {
    try {
      const result = await dbManager.itemRepository.findAllWithCategory();
      const grouped = groupByCategory(result);
      setItems(grouped);
    } catch (error) {
      Alert.alert("Error", "Failed to load data");
    }
  }, [dbManager]);

  const deleteItem = useCallback(
    async (id: number) => {
      try {
        await dbManager.itemRepository.delete(id);
        await loadItems();
      } catch (error) {
        Alert.alert("Error", "Failed to delete data");
      }
    },
    [dbManager, loadItems],
  );

  return {
    text,
    items,
    setText,
    loadItems,
    deleteItem,
  };
};