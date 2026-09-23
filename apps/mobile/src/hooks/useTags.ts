import { useCallback, useState } from "react";
import { Alert } from "react-native";
import type { Tag } from "@milkbox/shared";
import type { DatabaseManager } from "../repositories/sqlite/DatabaseManager";

export interface UseTagsParams {
  dbManager: DatabaseManager;
}

export interface UseTagsResult {
  tags: Tag[];
  loadTags: () => Promise<void>;
  // 既存タグ名ならそれを再利用し(find-or-create)、新規なら作成して返す。失敗時はnull。
  createTag: (name: string) => Promise<Tag | null>;
}

export const useTags = ({ dbManager }: UseTagsParams): UseTagsResult => {
  const [tags, setTags] = useState<Tag[]>([]);

  const loadTags = useCallback(async () => {
    try {
      setTags(await dbManager.tagRepository.findAll());
    } catch {
      Alert.alert("エラー", "タグの読み込みに失敗しました");
    }
  }, [dbManager]);

  const createTag = useCallback(async (name: string): Promise<Tag | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;

    try {
      const tag = await dbManager.tagRepository.create(trimmed);
      await loadTags();
      return tag;
    } catch {
      Alert.alert("エラー", "タグの追加に失敗しました");
      return null;
    }
  }, [dbManager, loadTags]);

  return { tags, loadTags, createTag };
};
