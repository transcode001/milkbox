import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";
import type { Category } from "../repositories/sqlite/CategoryRepository";
import type { DatabaseManager } from "../repositories/sqlite/DatabaseManager";

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
  showDeleteCategoryModal: boolean;
  newCategoryName: string;
  setSelectedOption: React.Dispatch<React.SetStateAction<string>>;
  setNoCategoryChecked: React.Dispatch<React.SetStateAction<boolean>>;
  setShowAddCategoryModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowDeleteCategoryModal: React.Dispatch<React.SetStateAction<boolean>>;
  setNewCategoryName: React.Dispatch<React.SetStateAction<string>>;
  loadCategories: () => Promise<void>;
  handleAddCategory: () => Promise<void>;
  handleDeleteCategory: (mode: DeleteCategoryMode, loadItems: () => Promise<void>) => Promise<void>;
}

export const useCategory = ({ dbManager }: UseCategoryParams): UseCategoryResult => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [noCategoryChecked, setNoCategoryChecked] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);

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
    } catch (error) {
      Alert.alert("Error", "Failed to load categories");
    }
  }, [dbManager]);

  const handleAddCategory = useCallback(async () => {
    if (!newCategoryName.trim()) {
      Alert.alert("Error", "Please enter category name");
      return;
    }

    try {
      await dbManager.categoryRepository.create(newCategoryName);
      setNewCategoryName("");
      setShowAddCategoryModal(false);
      await loadCategories();
      Alert.alert("Success", "Category added!");
    } catch (error) {
      Alert.alert("Error", "Failed to add category");
    }
  }, [dbManager, loadCategories, newCategoryName]);

  const handleDeleteCategory = useCallback(
    async (mode: DeleteCategoryMode, loadItems: () => Promise<void>) => {
      if (!selectedOption) {
        return;
      }

      const categoryId = Number(selectedOption);

      try {
        if (mode === "delete") {
          await dbManager.itemRepository.deleteByCategoryId(categoryId);
        } else {
          await dbManager.itemRepository.clearCategoryByCategoryId(categoryId);
        }

        await dbManager.categoryRepository.delete(categoryId);
        setSelectedOption("");
        await Promise.all([loadCategories(), loadItems()]);
      } catch (error) {
        Alert.alert("Error", "カテゴリの削除に失敗しました");
      }
    },
    [dbManager, loadCategories, selectedOption],
  );

  return {
    categories,
    selectedOption,
    selectedCategoryName,
    noCategoryChecked,
    showAddCategoryModal,
    showDeleteCategoryModal,
    newCategoryName,
    setSelectedOption,
    setNoCategoryChecked,
    setShowAddCategoryModal,
    setShowDeleteCategoryModal,
    setNewCategoryName,
    loadCategories,
    handleAddCategory,
    handleDeleteCategory,
  };
};