import { useCallback, useRef, useState } from "react";
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
import { colors, radii, spacing } from "../styles/tokens";
import { modalStyles } from "../styles/modalStyles";
import { useFocusEffect, type CompositeScreenProps } from "@react-navigation/native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import Swipeable from "react-native-gesture-handler/Swipeable";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import {
  DEFAULT_REMINDER_MINUTES,
  NONE_REMINDER_VALUE,
  type Category,
  type SavedItem,
} from "@milkbox/shared";
import type { RootStackParamList, RootTabParamList } from "../navigation/types";
import { CategorySection, groupByCategory } from "../utils/groupByCategory";
import { CategoryEditorModal } from "../components/CategoryEditorModal";
import { useDatabaseManager } from "../contexts/DatabaseContext";
import { formatWeekdayLabels, parseWeekdays } from "../utils/weekdays";
import { isEndDateBeforeStartDate } from "../utils/dateValidation";
import { DEFAULT_COLORS } from "../constants/colors";

type Props = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, "Home">,
  NativeStackScreenProps<RootStackParamList>
>;

const parseOptionalDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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
  } | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryWeekdays, setEditCategoryWeekdays] = useState<number[]>([]);
  const [editCategoryColor, setEditCategoryColor] = useState<string>(DEFAULT_COLORS.category);
  const [editingItem, setEditingItem] = useState<SavedItem | null>(null);
  const [editItemText, setEditItemText] = useState("");
  const [editItemStartDate, setEditItemStartDate] = useState<Date | null>(null);
  const [editItemEndDate, setEditItemEndDate] = useState<Date | null>(null);
  const [showItemDatePicker, setShowItemDatePicker] = useState<
    "start" | "end" | null
  >(null);
  const [togglingNotificationItemId, setTogglingNotificationItemId] = useState<number | null>(null);
  const togglingNotificationRef = useRef(false);
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

  const handleToggleItemNotification = async (item: SavedItem) => {
    if (togglingNotificationRef.current) return;
    togglingNotificationRef.current = true;

    const enabled = !item.notificationEnabled;
    const notificationMinutesBefore = enabled
      ? item.notificationMinutesBefore === NONE_REMINDER_VALUE
        ? DEFAULT_REMINDER_MINUTES
        : item.notificationMinutesBefore
      : NONE_REMINDER_VALUE;

    try {
      setTogglingNotificationItemId(item.id);
      await dbManager.updateItem(item.id, {
        notificationEnabled: enabled,
        notificationMinutesBefore,
      });
      await loadItems();
    } catch {
      Alert.alert("エラー", "通知設定の更新に失敗しました");
    } finally {
      togglingNotificationRef.current = false;
      setTogglingNotificationItemId(null);
    }
  };

  const openCategoryEditor = (category: Category) => {
    const weekdays = parseWeekdays(category.weekdays);
    setEditingCategory({
      id: category.id,
    });
    setEditCategoryName(category.name);
    setEditCategoryWeekdays(weekdays);
    setEditCategoryColor(category.color);
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
    const trimmedName = editCategoryName.trim();
    if (!trimmedName) {
      Alert.alert("Error", "カテゴリ名を入力してください");
      return;
    }

    try {
      await dbManager.updateCategory(
        editingCategory.id,
        trimmedName,
        editCategoryWeekdays.length > 0
          ? JSON.stringify(editCategoryWeekdays)
          : null,
        undefined,
        undefined,
        editCategoryColor,
      );
      setEditingCategory(null);
      await loadItems();
      Alert.alert("完了", "カテゴリ内容を変更しました");
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

  const handleItemDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    // mode="datetime" は iOS では spinner 表示になり、操作中に onChange が
    // 連続発火するため、iOS では自動で閉じず既存の「閉じる」ボタンに任せる。
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
      <CategoryEditorModal
        visible={editingCategory !== null}
        name={editCategoryName}
        weekdays={editCategoryWeekdays}
        color={editCategoryColor}
        onChangeName={setEditCategoryName}
        onToggleWeekday={toggleEditCategoryWeekday}
        onChangeColor={setEditCategoryColor}
        onCancel={() => setEditingCategory(null)}
        onSave={() => void handleUpdateCategory()}
      />

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
                <Text style={[styles.modalButtonText, modalStyles.modalButtonCancelText]}>
                  キャンセル
                </Text>
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
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.addTaskButton} onPress={handleNavigateAddTask}>
            <Text style={styles.addTaskButtonText}>追加</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate("Settings")}
            accessibilityLabel="設定"
          >
            <Ionicons name="settings-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>
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
                <View style={styles.itemContainer}>
                  <TouchableOpacity
                    style={styles.itemEditButton}
                    onPress={() => openItemEditor(item)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.itemMainRow}>
                      <View
                        style={[
                          styles.itemColorIndicator,
                          { backgroundColor: item.color || DEFAULT_COLORS.task },
                        ]}
                      />
                      <Text style={styles.itemText}>{item.text}</Text>
                      {hasDateRange(item) && dateTimeRange ? (
                        <Text style={styles.itemDateSummary}>{dateTimeRange}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.notificationToggle}
                    onPress={() => void handleToggleItemNotification(item)}
                    disabled={togglingNotificationItemId !== null}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`${item.text}の通知`}
                    accessibilityState={{
                      checked: item.notificationEnabled,
                      disabled: togglingNotificationItemId !== null,
                    }}
                  >
                    <View style={[
                      styles.notificationCheckbox,
                      item.notificationEnabled && styles.notificationCheckboxChecked,
                    ]}>
                      {item.notificationEnabled ? (
                        <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
                      ) : null}
                    </View>
                    <Text style={styles.notificationToggleText}>通知</Text>
                  </TouchableOpacity>
                </View>
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
  notificationToggle: {
    minHeight: 44,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  notificationCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: colors.tabInactive,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  notificationCheckboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  notificationToggleText: {
    fontSize: 12,
    color: colors.textSecondary,
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
    backgroundColor: colors.destructive,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    marginVertical: 4,
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

export default HomeScreen;
