import { StyleSheet } from "react-native";
import { colors, radii, spacing } from "../tokens";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
    textAlign: "center",
  },
  date: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: "center",
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: "column",
    gap: 12,
  },
  dateControlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  dateSelectorButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
  },
  dateSelectorButtonText: {
    fontSize: 14,
    color: "#333",
  },
  dateClearButton: {
    backgroundColor: "#f0f0f0",
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dateClearButtonText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  datePickerPanel: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: radii.md,
    padding: 8,
    marginBottom: 8,
  },
  datePicker: {
    marginBottom: 8,
  },
  datePickerCloseButton: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  datePickerCloseButtonText: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  weekdayContainer: {
    marginTop: 12,
  },
  weekdayHelpText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radii.md,
    alignSelf: "center",
  },
  pickerContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: radii.md,
    padding: 10,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  pickerActions: {
    flexDirection: "row",
    gap: 8,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  addCategoryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  addCategoryButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  removeCategoryButton: {
    backgroundColor: colors.destructive,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  removeCategoryButtonDisabled: {
    // 旧#dc3545由来の固定ピンクではなく、colors.destructiveを薄めた同系色にする
    // (他の無効状態と同じopacityパターンに合わせる)。
    opacity: 0.45,
  },
  removeCategoryButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  picker: {
    height: 150,
  },
  pickerDisabled: {
    opacity: 0.5,
  },
  pickerItem: {
    height: 150,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: "#888",
    // radii.smはボタン用トークンでAndroidでは20(=このボックスの半径)になり円形化してしまうため、
    // 固定サイズのチェックボックスには使わず控えめな角丸を直接指定する。
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: colors.background,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxMark: {
    color: colors.onPrimary,
    fontWeight: "700",
    lineHeight: 16,
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#333",
  },
  reminderContainer: {
    marginBottom: 8,
  },
  reminderPicker: {
    height: 120,
  },
  reminderPickerItem: {
    height: 120,
    fontSize: 14,
  },
  selectedText: {
    padding: 10,
    fontSize: 14,
    color: "#666",
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  formContainer: {
    marginTop: 20,
    width: "100%",
  },
  textarea: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: radii.md,
    padding: 12,
    minHeight: 100,
    textAlignVertical: "top",
  },
  submitButton: {
    // 画面内の他の青いボタン群と区別できるよう、送信の確定操作だけは専用色を使う。
    backgroundColor: colors.success,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radii.md,
    marginTop: 12,
  },
  navigateButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radii.md,
    marginTop: 12,
  },
  listContainer: {
    marginTop: 20,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  itemContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: radii.md,
    marginBottom: 8,
    backgroundColor: "#f9f9f9",
  },
  itemTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  itemText: {
    fontSize: 14,
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  deleteButton: {
    backgroundColor: colors.destructive,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
  },
  deleteButtonText: {
    color: colors.onPrimary,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: radii.modal,
    padding: 20,
    width: "80%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  modalMessage: {
    fontSize: 14,
    color: "#333",
    marginBottom: 16,
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: radii.md,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalActionStack: {
    gap: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: colors.cancelBackground,
  },
  modalButtonSubmit: {
    backgroundColor: colors.primary,
  },
  modalButtonDanger: {
    backgroundColor: colors.destructive,
  },
  modalButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  sectionHeader: {
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: radii.sm,
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.onPrimary,
  },
  emptyListText: {
    fontSize: 14,
    color: "#666",
    paddingVertical: 12,
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    color: colors.destructive,
    fontWeight: "500",
  },
});
