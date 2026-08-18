import React from "react";
import {
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

interface CategoryEditorModalProps {
  visible: boolean;
  name: string;
  weekdays: number[];
  onChangeName: (name: string) => void;
  onToggleWeekday: (weekday: number) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const CategoryEditorModal = ({
  visible,
  name,
  weekdays,
  onChangeName,
  onToggleWeekday,
  onCancel,
  onSave,
}: CategoryEditorModalProps) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="fade"
    onRequestClose={onCancel}
  >
    <KeyboardAvoidingView
      style={styles.overlay}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.title}>カテゴリを編集</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={onChangeName}
          placeholder="カテゴリ名"
          returnKeyType="done"
          onSubmitEditing={onSave}
        />
        <Text style={styles.fieldLabel}>曜日</Text>
        <Text style={styles.helpText}>このカテゴリで繰り返す曜日を選択してください。</Text>
        <WeekdayButtonGroup
          selectedWeekdays={weekdays}
          onToggleWeekday={onToggleWeekday}
        />
        <View style={styles.buttons}>
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
            <Text style={[styles.buttonText, modalStyles.modalButtonCancelText]}>キャンセル</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={onSave}>
            <Text style={styles.buttonText}>保存</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

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
