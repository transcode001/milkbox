import { useCallback, useState } from "react";
import { Alert } from "react-native";
import type { Category } from "../repositories/sqlite/CategoryRepository";
import type { DatabaseManager } from "../repositories/sqlite/DatabaseManager";

type DeleteCategoryMode = "delete" | "uncategorize";

export interface UseCategoryParams {
  dbManager: DatabaseManager;
}

export interface UseCategoryResult {
  categories: Category[];
  selectedOption: string;
  noCategoryChecked: boolean;
  showAddCategoryModal: boolean;
  newCategoryName: string;
  setSelectedOption: React.Dispatch<React.SetStateAction<string>>;
  setNoCategoryChecked: React.Dispatch<React.SetStateAction<boolean>>;
  setShowAddCategoryModal: React.Dispatch<React.SetStateAction<boolean>>;
  setNewCategoryName: React.Dispatch<React.SetStateAction<string>>;
  loadCategories: () => Promise<void>;
  handleAddCategory: () => Promise<void>;
  handleDeleteCategory: (mode: DeleteCategoryMode, loadItems: () => Promise<void>) => Promise<void>;
  showDeleteCategoryDialog: (loadItems: () => Promise<void>) => void;
}

export const useCategory = ({ dbManager }: UseCategoryParams): UseCategoryResult => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [noCategoryChecked, setNoCategoryChecked] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

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
        Alert.alert("Error", "削除するカテゴリを選択してください");
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
        Alert.alert("Success", "カテゴリを削除しました");
      } catch (error) {
        Alert.alert("Error", "カテゴリの削除に失敗しました");
      }
    },
    [dbManager, loadCategories, selectedOption],
  );

  const showDeleteCategoryDialog = useCallback(
    (loadItems: () => Promise<void>) => {
      if (!selectedOption) {
        Alert.alert("Error", "削除するカテゴリを選択してください");
        return;
      }

      const currentCategory = categories.find((category) => category.id.toString() === selectedOption);
      const categoryName = currentCategory?.name ?? "このカテゴリ";

      Alert.alert(
        "カテゴリを削除",
        `「${categoryName}」を削除します。\n登録済みの内容をどうしますか？`,
        [
          {
            text: "削除",
            style: "destructive",
            onPress: () => {
              void handleDeleteCategory("delete", loadItems);
            },
          },
          {
            text: "未分類",
            onPress: () => {
              void handleDeleteCategory("uncategorize", loadItems);
            },
          },
          {
            text: "キャンセル",
            style: "cancel",
          },
        ],
      );
    },
    [categories, handleDeleteCategory, selectedOption],
  );

  return {
    categories,
    selectedOption,
    noCategoryChecked,
    showAddCategoryModal,
    newCategoryName,
    setSelectedOption,
    setNoCategoryChecked,
    setShowAddCategoryModal,
    setNewCategoryName,
    loadCategories,
    handleAddCategory,
    handleDeleteCategory,
    showDeleteCategoryDialog,
  };
};