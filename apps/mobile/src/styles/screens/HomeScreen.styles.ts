import { StyleSheet } from "react-native";
import { colors, radii, spacing } from "../tokens";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
  },
  notificationWarning: {
    backgroundColor: "#FFF8D6",
    borderBottomWidth: 1,
    borderBottomColor: "#F0E2A0",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  notificationWarningText: {
    color: "#666",
    fontSize: 12,
    lineHeight: 18,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingsButton: {
    padding: 4,
  },
  addTaskButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.md,
  },
  addTaskButtonText: {
    color: colors.onPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
  },
  sectionHeaderContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 44,
  },
  sectionToggle: {
    width: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionCategoryLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    flexShrink: 0,
  },
  sectionHeaderText: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  sectionWeekdays: {
    flexShrink: 0,
    color: "#666",
    fontSize: 12,
    fontWeight: "600",
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  itemEditButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  itemMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    flexShrink: 0,
  },
  itemText: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  itemDateSummary: {
    flexShrink: 0,
    color: "#666",
    fontSize: 12,
  },
  // Figmaの更新でチェックボックス+「通知」テキストからベル型アイコン1つに
  // 変わったため、タップ領域確保のためのpaddingだけ残しシンプルにしている。
  notificationToggle: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  stateText: {
    fontSize: 14,
    color: "#666",
  },
  // FigmaのSwipe Delete Row(327:163)に合わせて、行の高さいっぱい・角丸なし・
  // 余白なしのボタンにする(以前は浮いたピル型だったが、スワイプで隠れていた
  // 部分がそのまま露出する見た目に変更)。
  deleteAction: {
    width: 64,
    height: "100%",
    backgroundColor: colors.destructive,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteActionText: {
    color: colors.onPrimary,
    fontWeight: "700",
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.background,
    borderRadius: radii.modal,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: radii.md,
    padding: 12,
    fontSize: 16,
    marginBottom: 14,
  },
  modalTextArea: {
    minHeight: 96,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  // Figma上では「通知を設定しない」チェックボックス+テキストではなく、
  // ベルアイコン(タップで有効/無効を切替、Homeの一覧と同じ考え方)+
  // タイミングドロップダウンを横並びにした1行になっている。
  notificationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  notificationDropdown: {
    flex: 1,
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  dateColumn: {
    flex: 1,
  },
  dateSelectorButton: {
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
  datePickerPanel: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 8,
    marginBottom: 14,
  },
  datePickerCloseButton: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  datePickerCloseButtonText: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: "600",
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
});
