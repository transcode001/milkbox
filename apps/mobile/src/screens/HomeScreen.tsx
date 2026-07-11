import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import Swipeable from "react-native-gesture-handler/Swipeable";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { Category, SavedItem } from "@milkbox/shared";
import type { RootTabParamList } from "../navigation/types";
import { CategorySection, groupByCategory } from "../utils/groupByCategory";
import { useDatabaseManager } from "../contexts/DatabaseContext";
import { formatWeekdayLabels, parseWeekdays } from "../utils/weekdays";
import { isEndDateBeforeStartDate } from "../utils/dateValidation";

type Props = BottomTabScreenProps<RootTabParamList, "Home">;

const WEEKDAY_OPTIONS = [
  { value: 0, label: "日" },
  { value: 1, label: "月" },
  { value: 2, label: "火" },
  { value: 3, label: "水" },
  { value: 4, label: "木" },
  { value: 5, label: "金" },
  { value: 6, label: "土" },
] as const;

const parseOptionalDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateOnly = (value: Date | null): string => {
  if (!value) return "未設定";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
};

const toLocalDateString = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatCategoryWeekdays = (section: CategorySection, category?: Category): string | null => {
  const categoryLabels = formatWeekdayLabels(category?.weekdays);
  if (categoryLabels) return categoryLabels;

  const weekdays = new Set<number>();

  for (const item of section.data) {
    for (const weekday of parseWeekdays(item.weekdays)) {
      weekdays.add(weekday);
    }
  }

  return formatWeekdayLabels(
    JSON.stringify([...weekdays].sort((left, right) => left - right)),
  );
};

const HomeScreen = ({ navigation }: Props) => {
  const [sections, setSections] = useState<CategorySection[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<{
    id: number;
    name: string;
    weekdays: number[];
    startDate: Date | null;
    endDate: Date | null;
  } | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryWeekdays, setEditCategoryWeekdays] = useState<number[]>([]);
  const [editCategoryStartDate, setEditCategoryStartDate] = useState<Date | null>(null);
  const [editCategoryEndDate, setEditCategoryEndDate] = useState<Date | null>(null);
  const [showCategoryDatePicker, setShowCategoryDatePicker] = useState<
    "start" | "end" | null
  >(null);
  const [editingItem, setEditingItem] = useState<SavedItem | null>(null);
  const [editItemText, setEditItemText] = useState("");
  const [editItemStartDate, setEditItemStartDate] = useState<Date | null>(null);
  const [editItemEndDate, setEditItemEndDate] = useState<Date | null>(null);
  const [showItemDatePicker, setShowItemDatePicker] = useState<
    "start" | "end" | null
  >(null);
  const { dbManager, notificationsEnabled } = useDatabaseManager();

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const [result, categoryResult] = await Promise.all([
        dbManager.itemRepository.findAllWithCategory(),
        dbManager.categoryRepository.findAll(),
      ]);
      const grouped = groupByCategory(result);

      setSections(grouped);
      setCategories(categoryResult);
    } catch {
      setErrorMessage("タスクの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [dbManager]);

  useFocusEffect(
    useCallback(() => {
      void loadItems();
    }, [loadItems])
  );

  const handleNavigateAddTask = () => {
    navigation.navigate("AddTask");
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await dbManager.deleteItem(id);
      await loadItems();
    } catch {
      Alert.alert("エラー", "タスクの削除に失敗しました");
    }
  };

  const openCategoryEditor = (category: Category) => {
    const weekdays = parseWeekdays(category.weekdays);
    setEditingCategory({
      id: category.id,
      name: category.name,
      weekdays,
      startDate: parseOptionalDate(category.startDate),
      endDate: parseOptionalDate(category.endDate),
    });
    setEditCategoryName(category.name);
    setEditCategoryWeekdays(weekdays);
    setEditCategoryStartDate(parseOptionalDate(category.startDate));
    setEditCategoryEndDate(parseOptionalDate(category.endDate));
    setShowCategoryDatePicker(null);
  };

  const openItemEditor = (item: SavedItem) => {
    setEditingItem(item);
    setEditItemText(item.text);
    setEditItemStartDate(parseOptionalDate(item.startDate));
    setEditItemEndDate(parseOptionalDate(item.endDate));
    setShowItemDatePicker(null);
  };

  const toggleEditCategoryWeekday = (weekday: number) => {
    setEditCategoryWeekdays((current) =>
      current.includes(weekday)
        ? current.filter((value) => value !== weekday)
        : [...current, weekday].sort((left, right) => left - right),
    );
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
    if (isEndDateBeforeStartDate(editCategoryStartDate, editCategoryEndDate)) {
      Alert.alert("エラー", "終了日が開始日より前です。終了日を再設定してください。");
      return;
    }

    try {
      await dbManager.updateCategory(
        editingCategory.id,
        editCategoryName || undefined,
        editCategoryWeekdays.length > 0
          ? JSON.stringify(editCategoryWeekdays)
          : null,
        editCategoryStartDate ? toLocalDateString(editCategoryStartDate) : null,
        editCategoryEndDate ? toLocalDateString(editCategoryEndDate) : null,
      );
      setEditingCategory(null);
      await loadItems();
    } catch {
      Alert.alert("エラー", "タスクの更新に失敗しました");
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    if (isEndDateBeforeStartDate(editItemStartDate, editItemEndDate)) {
      Alert.alert("エラー", "終了日時が開始日時より前です。終了日時を再設定してください。");
      return;
    }

    try {
      await dbManager.updateItem(editingItem.id, {
        text: editItemText || undefined,
        startDate: editItemStartDate?.toISOString() ?? null,
        endDate: editItemEndDate?.toISOString() ?? null,
      });
      setEditingItem(null);
      await loadItems();
    } catch {
      Alert.alert("エラー", "サブタスクの更新に失敗しました");
    }
  };

  const handleCategoryDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS !== "ios") {
      setShowCategoryDatePicker(null);
    }
    if (!selectedDate || !showCategoryDatePicker) return;

    if (showCategoryDatePicker === "start") {
      setEditCategoryStartDate(selectedDate);
    } else {
      setEditCategoryEndDate(selectedDate);
    }
  };

  const handleItemDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS !== "ios") {
      setShowItemDatePicker(null);
    }
    if (!selectedDate || !showItemDatePicker) return;

    if (showItemDatePicker === "start") {
      setEditItemStartDate(selectedDate);
    } else {
      setEditItemEndDate(selectedDate);
    }
  };

  const renderRightActions = (id: number) => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => {
        void handleDeleteItem(id);
      }}
      activeOpacity={0.8}
    >
      <Text style={styles.deleteActionText}>削除</Text>
    </TouchableOpacity>
  );

  const formatItemDateTime = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${year}.${month}.${day} ${hour}:${minute}`;
  };

  const formatItemDateTimeRange = (item: { startDate?: string; endDate?: string }) => {
    if (item.startDate && item.endDate) {
      return `${formatItemDateTime(item.startDate)} ～ ${formatItemDateTime(item.endDate)}`;
    }
    if (item.startDate) {
      return `${formatItemDateTime(item.startDate)} ～`;
    }
    if (item.endDate) {
      return `～ ${formatItemDateTime(item.endDate)}`;
    }
    return null;
  };

  const hasDateRange = (item: { startDate?: string; endDate?: string }) =>
    Boolean(item.startDate || item.endDate);

  const categoryById = new Map(categories.map((category) => [category.id, category]));

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Modal
        visible={editingCategory !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditingCategory(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>タスクを編集</Text>
            <TextInput
              style={styles.modalInput}
              value={editCategoryName}
              onChangeText={setEditCategoryName}
              placeholder="タスク名"
              returnKeyType="done"
            />
            <Text style={styles.fieldLabel}>曜日</Text>
            <View style={styles.weekdayRow}>
              {WEEKDAY_OPTIONS.map((weekday) => {
                const selected = editCategoryWeekdays.includes(weekday.value);

                return (
                  <TouchableOpacity
                    key={weekday.value}
                    style={[styles.weekdayButton, selected && styles.weekdayButtonSelected]}
                    onPress={() => toggleEditCategoryWeekday(weekday.value)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.weekdayButtonText,
                        selected && styles.weekdayButtonTextSelected,
                      ]}
                    >
                      {weekday.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.dateRow}>
              <View style={styles.dateColumn}>
                <Text style={styles.fieldLabel}>開始日</Text>
                <TouchableOpacity
                  style={styles.dateSelectorButton}
                  onPress={() => setShowCategoryDatePicker("start")}
                >
                  <Text style={styles.dateSelectorButtonText}>
                    {formatDateOnly(editCategoryStartDate)}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.dateColumn}>
                <Text style={styles.fieldLabel}>終了日</Text>
                <TouchableOpacity
                  style={styles.dateSelectorButton}
                  onPress={() => setShowCategoryDatePicker("end")}
                >
                  <Text style={styles.dateSelectorButtonText}>
                    {formatDateOnly(editCategoryEndDate)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            {showCategoryDatePicker && (
              <View style={styles.datePickerPanel}>
                <DateTimePicker
                  value={
                    showCategoryDatePicker === "start"
                      ? editCategoryStartDate ?? new Date()
                      : editCategoryEndDate ?? new Date()
                  }
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "calendar"}
                  onChange={handleCategoryDateChange}
                  locale="ja-JP"
                />
                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    style={styles.datePickerCloseButton}
                    onPress={() => setShowCategoryDatePicker(null)}
                  >
                    <Text style={styles.datePickerCloseButtonText}>閉じる</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setEditingCategory(null)}
              >
                <Text style={styles.modalButtonText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={() => {
                  void handleUpdateCategory();
                }}
              >
                <Text style={styles.modalButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={editingItem !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditingItem(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>サブタスクを編集</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={editItemText}
              onChangeText={setEditItemText}
              placeholder="内容"
              multiline={true}
              textAlignVertical="top"
            />
            <View style={styles.dateRow}>
              <View style={styles.dateColumn}>
                <Text style={styles.fieldLabel}>開始日時</Text>
                <TouchableOpacity
                  style={styles.dateSelectorButton}
                  onPress={() => setShowItemDatePicker("start")}
                >
                  <Text style={styles.dateSelectorButtonText}>
                    {editItemStartDate ? formatItemDateTime(editItemStartDate.toISOString()) : "未設定"}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.dateColumn}>
                <Text style={styles.fieldLabel}>終了日時</Text>
                <TouchableOpacity
                  style={styles.dateSelectorButton}
                  onPress={() => setShowItemDatePicker("end")}
                >
                  <Text style={styles.dateSelectorButtonText}>
                    {editItemEndDate ? formatItemDateTime(editItemEndDate.toISOString()) : "未設定"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            {showItemDatePicker && (
              <View style={styles.datePickerPanel}>
                <DateTimePicker
                  value={
                    showItemDatePicker === "start"
                      ? editItemStartDate ?? new Date()
                      : editItemEndDate ?? new Date()
                  }
                  mode="datetime"
                  is24Hour={true}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleItemDateChange}
                  locale="ja-JP"
                />
                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    style={styles.datePickerCloseButton}
                    onPress={() => setShowItemDatePicker(null)}
                  >
                    <Text style={styles.datePickerCloseButtonText}>閉じる</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setEditingItem(null)}
              >
                <Text style={styles.modalButtonText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={() => {
                  void handleUpdateItem();
                }}
              >
                <Text style={styles.modalButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.title}>タスク</Text>
        <TouchableOpacity style={styles.addTaskButton} onPress={handleNavigateAddTask}>
          <Text style={styles.addTaskButtonText}>追加</Text>
        </TouchableOpacity>
      </View>

      {!notificationsEnabled && (
        <View style={styles.notificationWarning}>
          <Text style={styles.notificationWarningText}>
            通知が許可されていません。端末の設定からMilkboxの通知を有効にしてください。
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : errorMessage ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{errorMessage}</Text>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>タスクはまだありません</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => {
            const categoryId = section.data[0]?.categoryId;
            const category = categoryId ? categoryById.get(categoryId) : undefined;
            const weekdayLabels = formatCategoryWeekdays(section, category);
            const headerContent = (
              <>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
                {weekdayLabels ? (
                  <Text style={styles.sectionWeekdays}>{weekdayLabels}</Text>
                ) : null}
              </>
            );

            return category ? (
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => openCategoryEditor(category)}
                activeOpacity={0.8}
              >
                {headerContent}
              </TouchableOpacity>
            ) : (
              <View style={styles.sectionHeader}>
                {headerContent}
              </View>
            );
          }}
          renderItem={({ item }) => {
            const dateTimeRange = formatItemDateTimeRange(item);

            return (
              <Swipeable renderRightActions={() => renderRightActions(item.id)}>
                <TouchableOpacity
                  style={styles.itemContainer}
                  onPress={() => openItemEditor(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.itemMainRow}>
                    <Text style={styles.itemText}>{item.text}</Text>
                    {hasDateRange(item) && dateTimeRange ? (
                      <Text style={styles.itemDateSummary}>{dateTimeRange}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              </Swipeable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
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
  addTaskButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addTaskButtonText: {
    color: "#fff",
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
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  itemMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  deleteAction: {
    width: 84,
    height: "100%",
    backgroundColor: "#D11A2A",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    marginVertical: 4,
  },
  deleteActionText: {
    color: "#fff",
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
    backgroundColor: "#fff",
    borderRadius: 8,
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
    borderRadius: 8,
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
  weekdayRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
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
  weekdayButtonText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  weekdayButtonTextSelected: {
    color: "#fff",
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
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
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
    backgroundColor: "#007AFF",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  datePickerCloseButtonText: {
    color: "#fff",
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
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#ccc",
  },
  modalButtonSubmit: {
    backgroundColor: "#007AFF",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default HomeScreen;
