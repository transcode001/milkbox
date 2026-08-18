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
  categoryWeekdayHelp: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
  },
  pickerContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: radii.md,
    padding: 10,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  addCategoryOption: {
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addCategoryOptionText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "600",
  },
  categoryActions: {
    flexDirection: "row",
    flexShrink: 0,
  },
  categoryActionButton: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.tabInactive,
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
    marginTop: 8,
    marginBottom: 8,
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
    minHeight: 180,
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
  modalFieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  modalFieldHelp: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  modalWeekdayGroup: {
    width: "100%",
    marginBottom: 4,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
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
  modalButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    color: colors.destructive,
    fontWeight: "500",
  },
});
