import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";
import type { Category } from "@milkbox/shared";
import type { DatabaseManager } from "../repositories/sqlite/DatabaseManager";
import { DEFAULT_COLORS } from "../constants/colors";

export type DeleteCategoryMode = "delete" | "uncategorize";

export interface UseCategoryParams {
  dbManager: DatabaseManager;
}

export interface UseCategoryResult {
  categories: Category[];
  selectedOption: string;
  selectedCategoryName: string;
  noCategoryChecked: boolean;
  showAddCategoryModal: boolean;
  newCategoryName: string;
  newCategoryColor: string;
  setSelectedOption: React.Dispatch<React.SetStateAction<string>>;
  setNoCategoryChecked: React.Dispatch<React.SetStateAction<boolean>>;
  setShowAddCategoryModal: React.Dispatch<React.SetStateAction<boolean>>;
  setNewCategoryName: React.Dispatch<React.SetStateAction<string>>;
  setNewCategoryColor: React.Dispatch<React.SetStateAction<string>>;
  loadCategories: () => Promise<void>;
  handleAddCategory: (weekdays?: number[]) => Promise<boolean>;
  handleUpdateCategory: (categoryId: number, name: string, weekdays: number[], color: string) => Promise<boolean>;
  handleDeleteCategory: (categoryId: number, mode: DeleteCategoryMode) => Promise<void>;
}

export const useCategory = ({ dbManager }: UseCategoryParams): UseCategoryResult => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [noCategoryChecked, setNoCategoryChecked] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState<string>(DEFAULT_COLORS.category);

  const selectedCategoryName = useMemo(() => {
    const current = categories.find((category) => category.id.toString() === selectedOption);
    return current?.name ?? "このカテゴリ";
  }, [categories, selectedOption]);

  const loadCategories = useCallback(async () => {
    try {
      const result = await dbManager.categoryRepository.findAll();
      setCategories(result);
      setSelectedOption((prevSelectedOption) => {
        if (
          result.length > 0
          && (!prevSelectedOption || !result.some((category) => category.id.toString() === prevSelectedOption))
        ) {
          return result[0].id.toString();
        }

        return prevSelectedOption;
      });
    } catch {
      Alert.alert("Error", "Failed to load categories");
    }
  }, [dbManager]);

  const handleAddCategory = useCallback(async (weekdays?: number[]) => {
    if (!newCategoryName.trim()) {
      Alert.alert("Error", "Please enter category name");
      return false;
    }

    try {
      await dbManager.categoryRepository.create(
        newCategoryName,
        weekdays && weekdays.length > 0 ? JSON.stringify(weekdays) : undefined,
        undefined,
        undefined,
        newCategoryColor,
      );
      setNewCategoryName("");
      setNewCategoryColor(DEFAULT_COLORS.category);
      setShowAddCategoryModal(false);
      await loadCategories();
      Alert.alert("Success", "Category added!");
      return true;
    } catch {
      Alert.alert("Error", "Failed to add category");
      return false;
    }
  }, [dbManager, loadCategories, newCategoryColor, newCategoryName]);

  const handleUpdateCategory = useCallback(async (
    categoryId: number,
    name: string,
    weekdays: number[],
    color: string,
  ) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("Error", "カテゴリ名を入力してください");
      return false;
    }

    try {
      await dbManager.updateCategory(
        categoryId,
        trimmedName,
        weekdays.length > 0 ? JSON.stringify(weekdays) : null,
        undefined,
        undefined,
        color,
      );
      await loadCategories();
      Alert.alert("完了", "カテゴリ内容を変更しました");
      return true;
    } catch {
      Alert.alert("Error", "カテゴリの更新に失敗しました");
      return false;
    }
  }, [dbManager, loadCategories]);

  const handleDeleteCategory = useCallback(async (
    categoryId: number,
    mode: DeleteCategoryMode,
  ) => {
    try {
      if (mode === "delete") {
        await dbManager.deleteItemsByCategoryId(categoryId);
      } else {
        await dbManager.itemRepository.clearCategoryByCategoryId(categoryId);
      }

      await dbManager.categoryRepository.delete(categoryId);
      setSelectedOption((current) => current === categoryId.toString() ? "" : current);
      await loadCategories();
    } catch {
      Alert.alert("Error", "カテゴリの削除に失敗しました");
    }
  }, [dbManager, loadCategories]);

  return {
    categories,
    selectedOption,
    selectedCategoryName,
    noCategoryChecked,
    showAddCategoryModal,
    newCategoryName,
    newCategoryColor,
    setSelectedOption,
    setNoCategoryChecked,
    setShowAddCategoryModal,
    setNewCategoryName,
    setNewCategoryColor,
    loadCategories,
    handleAddCategory,
    handleUpdateCategory,
    handleDeleteCategory,
  };
};
