import React from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { modalStyles } from "../styles/modalStyles";
import { colors, radii } from "../styles/tokens";
import { WeekdayButtonGroup } from "./WeekdayButtonGroup";
import { ColorPicker } from "./ColorPicker";
import { DEFAULT_COLORS } from "../constants/colors";

// 新規追加(AddTaskScreenのカテゴリ追加)と既存編集(AddTaskScreen/HomeScreenの
// カテゴリ編集)は、名前+曜日+色+ボタン2つという同じ構成のフォームだったため、
// タイトル・プレースホルダー・送信ボタンのラベルだけ mode で出し分けて1つに統合した。
type CategoryEditorMode = "add" | "edit";

interface CategoryEditorModalProps {
  visible: boolean;
  mode: CategoryEditorMode;
  name: string;
  weekdays: number[];
  color: string;
  onChangeName: (name: string) => void;
  onToggleWeekday: (weekday: number) => void;
  onChangeColor: (color: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

const MODE_COPY: Record<CategoryEditorMode, {
  title: string;
  namePlaceholder: string;
  saveLabel: string;
  animationType: "slide" | "fade";
}> = {
  add: {
    title: "カテゴリを追加",
    namePlaceholder: "カテゴリ名を入力",
    saveLabel: "追加",
    animationType: "slide",
  },
  edit: {
    title: "カテゴリを編集",
    namePlaceholder: "カテゴリ名",
    saveLabel: "保存",
    animationType: "fade",
  },
};

export const CategoryEditorModal = ({
  visible,
  mode,
  name,
  weekdays,
  color,
  onChangeName,
  onToggleWeekday,
  onChangeColor,
  onCancel,
  onSave,
}: CategoryEditorModalProps) => {
  const copy = MODE_COPY[mode];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType={copy.animationType}
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{copy.title}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={onChangeName}
            placeholder={copy.namePlaceholder}
            returnKeyType="done"
            onSubmitEditing={() => {
              Keyboard.dismiss();
              onSave();
            }}
          />
          <Text style={styles.fieldLabel}>曜日</Text>
          <Text style={styles.helpText}>このカテゴリで繰り返す曜日を選択してください。</Text>
          <WeekdayButtonGroup
            selectedWeekdays={weekdays}
            onToggleWeekday={onToggleWeekday}
          />
          <Text style={styles.colorLabel}>色</Text>
          <ColorPicker
            value={color}
            defaultColor={DEFAULT_COLORS.category}
            onChange={onChangeColor}
          />
          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
              <Text style={[styles.buttonText, modalStyles.modalButtonCancelText]}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={onSave}>
              <Text style={styles.buttonText}>{copy.saveLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  content: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.background,
    borderRadius: radii.modal,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: radii.md,
    padding: 12,
    fontSize: 16,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  helpText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  colorLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 14,
    marginBottom: 6,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: colors.cancelBackground,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
});
