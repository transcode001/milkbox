import { useCallback, useState } from "react";
import { Alert } from "react-native";
import type { DatabaseManager } from "../repositories/sqlite/DatabaseManager";
import { isEndDateBeforeStartDate } from "../utils/dateValidation";
import type { ActiveDateField } from "./useDatePicker";
import type { CategorySection } from "../utils/groupByCategory";
import { groupByCategory } from "../utils/groupByCategory";

export interface UseItemFormParams {
  dbManager: DatabaseManager;
  selectedOption: string;
  noCategoryChecked: boolean;
  startDate: Date | null;
  endDate: Date | null;
  setStartDate: React.Dispatch<React.SetStateAction<Date | null>>;
  setEndDate: React.Dispatch<React.SetStateAction<Date | null>>;
  setActiveDateField: React.Dispatch<React.SetStateAction<ActiveDateField>>;
  onNavigateHome: () => void;
}

export interface UseItemFormResult {
  text: string;
  items: CategorySection[];
  setText: React.Dispatch<React.SetStateAction<string>>;
  loadItems: () => Promise<void>;
  handleSubmit: () => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
}

export const useItemForm = ({
  dbManager,
  selectedOption,
  noCategoryChecked,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  setActiveDateField,
  onNavigateHome,
}: UseItemFormParams): UseItemFormResult => {
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

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) {
      Alert.alert("Error", "Please enter some text");
      return;
    }

    if (isEndDateBeforeStartDate(startDate, endDate)) {
      Alert.alert("日付エラー", "終了日が開始日より前です。終了日を再設定してください。");
      return;
    }

    if (!noCategoryChecked && !selectedOption) {
      Alert.alert("Error", "タスクを選択してください");
      return;
    }

    const fallbackDate = startDate ?? endDate ?? new Date();

    try {
      await dbManager.itemRepository.create({
        categoryId: noCategoryChecked ? undefined : Number(selectedOption),
        text,
        date: fallbackDate.toISOString(),
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      });
      setText("");
      setStartDate(null);
      setEndDate(null);
      setActiveDateField(null);
      await loadItems();
      Alert.alert("登録完了", "続けて予定を登録しますか？", [
        {
          text: "続けて登録する",
          style: "cancel",
        },
        {
          text: "ホームへ戻る",
          onPress: onNavigateHome,
        },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to save data");
    }
  }, [
    dbManager,
    endDate,
    loadItems,
    noCategoryChecked,
    onNavigateHome,
    selectedOption,
    setActiveDateField,
    setEndDate,
    setStartDate,
    startDate,
    text,
  ]);

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
    handleSubmit,
    deleteItem,
  };
};