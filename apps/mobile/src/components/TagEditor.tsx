import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { Tag } from "@milkbox/shared";
import { colors, radii, spacing } from "../styles/tokens";

interface TagEditorProps {
  allTags: Tag[];
  selectedTagIds: number[];
  onToggleTag: (tagId: number) => void;
  // 作成できたかどうかを返す。失敗時に入力をクリアしてしまうと打ち直しになるため、
  // 成功した時だけ入力欄をクリアする。
  onCreateTag: (name: string) => Promise<boolean>;
}

// 既存タグはトグル式のチップ一覧から選ぶ(自由入力の再タイプによる表記ゆれを防ぐ)、
// まだ無いタグだけ下のテキスト入力から作成する、という2系統をまとめたエディタ。
// AddTaskScreen(新規作成)とHomeScreenの編集モーダルの両方から共通で使う。
export function TagEditor({ allTags, selectedTagIds, onToggleTag, onCreateTag }: TagEditorProps) {
  const [newTagName, setNewTagName] = useState("");

  const submitNewTag = async () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    const created = await onCreateTag(trimmed);
    if (created) setNewTagName("");
  };

  return (
    <View>
      {allTags.length > 0 ? (
        <View style={styles.chipRow}>
          {allTags.map((tag) => {
            const selected = selectedTagIds.includes(tag.id);
            return (
              <TouchableOpacity
                key={tag.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => onToggleTag(tag.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{tag.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={newTagName}
          onChangeText={setNewTagName}
          placeholder="新しいタグ"
          returnKeyType="done"
          onSubmitEditing={() => void submitNewTag()}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => void submitNewTag()}
          accessibilityRole="button"
          accessibilityLabel="タグを追加"
        >
          <Text style={styles.addButtonText}>追加</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: colors.background,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "600",
  },
  chipTextSelected: {
    color: colors.onPrimary,
  },
  inputRow: {
    flexDirection: "row",
    gap: spacing.xs,
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: radii.md,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    fontSize: 14,
  },
  addButton: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
  },
  addButtonText: {
    color: colors.onPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
});
