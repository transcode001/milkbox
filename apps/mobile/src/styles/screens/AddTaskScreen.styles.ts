import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 8,
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
    color: "#999",
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
    flexDirection: "row",
    gap: 12,
  },
  dateRowStacked: {
    flexDirection: "column",
  },
  dateColumn: {
    flex: 1,
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
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  dateSelectorButtonText: {
    fontSize: 14,
    color: "#333",
  },
  dateClearButton: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dateClearButtonText: {
    fontSize: 12,
    color: "#555",
    fontWeight: "600",
  },
  datePickerPanel: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  datePicker: {
    marginBottom: 8,
  },
  datePickerCloseButton: {
    alignSelf: "flex-end",
    backgroundColor: "#007AFF",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  datePickerCloseButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  weekdayContainer: {
    marginTop: 12,
  },
  weekdayRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  weekdayHelpText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  weekdayButton: {
    minWidth: 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  weekdayButtonSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  weekdayButtonDisabled: {
    opacity: 0.45,
  },
  weekdayButtonText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  weekdayButtonTextSelected: {
    color: "#fff",
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: "center",
  },
  pickerContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
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
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  addCategoryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  removeCategoryButton: {
    backgroundColor: "#dc3545",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  removeCategoryButtonDisabled: {
    backgroundColor: "#e9a5ad",
  },
  removeCategoryButtonText: {
    color: "#fff",
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
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: "#fff",
  },
  checkboxChecked: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  checkboxMark: {
    color: "#fff",
    fontWeight: "700",
    lineHeight: 16,
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#333",
  },
  selectedText: {
    padding: 10,
    fontSize: 14,
    color: "#666",
  },
  buttonText: {
    color: "#fff",
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
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#28a745",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 12,
  },
  navigateButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
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
    borderRadius: 8,
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
    color: "#999",
  },
  deleteButton: {
    backgroundColor: "#dc3545",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
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
    borderRadius: 8,
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
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#ccc",
  },
  modalButtonSubmit: {
    backgroundColor: "#007AFF",
  },
  modalButtonDanger: {
    backgroundColor: "#dc3545",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  sectionHeader: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  emptyListText: {
    fontSize: 14,
    color: "#666",
    paddingVertical: 12,
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    color: "#dc3545",
    fontWeight: "500",
  },
});
