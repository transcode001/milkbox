import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
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
import { colors } from "../styles/tokens";
import { styles } from "../styles/screens/HomeScreen.styles";
import { modalStyles } from "../styles/modalStyles";
import { useFocusEffect, type CompositeScreenProps } from "@react-navigation/native";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
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
import { mergeDatePart, mergeTimePart } from "../hooks/useDatePicker";

type Props = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, "Home">,
  NativeStackScreenProps<RootStackParamList>
>;

// utils/calendarDates.ts の parseItemDate/parsePointDate と似ているが別物。
// あちらは「時刻を落として日付だけにする」「日付のみの文字列は9時扱いにする」
// といったカレンダー表示向けの正規化を行うのに対し、ここはサブタスク編集
// フォームの初期値としてstartDate/endDateをそのままDateへ変換したいだけ
// (時刻も保持する)ため、意図的に正規化していない。
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

  // iOS: mode="datetime" の spinner は宣言的な<DateTimePicker>のままで問題ないため据え置き。
  // 操作中に onChange が連続発火するため、自動では閉じず既存の「閉じる」ボタンに任せる。
  const handleItemDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (!selectedDate || !showItemDatePicker) return;

    if (showItemDatePicker === "start") {
      setEditItemStartDate(selectedDate);
    } else {
      setEditItemEndDate(selectedDate);
    }
  };

  // Android: 宣言的な<DateTimePicker>をこの編集モーダル(RNのModalコンポーネント)の中に
  // マウントすると、Modal自体が別ウィンドウのDialogとして描画されるAndroid上で、
  // ネイティブのDatePickerDialog(FragmentベースでActivityのFragmentManagerを使う)と
  // 競合してクラッシュすることがある。また"datetime"はAndroidでは無効なmodeで、
  // 実際には日付のみのダイアログに縮退してしまい時刻編集ができていなかった。
  // そのためAndroidだけは、Viewツリーに一切コンポーネントをマウントしない命令的API
  // (DateTimePickerAndroid.open)を使い、日付→時刻の順に2段階でダイアログを出す。
  const openAndroidItemDateTimePicker = (field: "start" | "end") => {
    const base = (field === "start" ? editItemStartDate : editItemEndDate) ?? new Date();

    DateTimePickerAndroid.open({
      value: base,
      mode: "date",
      onChange: (dateEvent, selectedDate) => {
        if (dateEvent.type !== "set" || !selectedDate) return;
        const mergedDate = mergeDatePart(base, selectedDate);

        DateTimePickerAndroid.open({
          value: mergedDate,
          mode: "time",
          is24Hour: true,
          onChange: (timeEvent, selectedTime) => {
            if (timeEvent.type !== "set" || !selectedTime) return;
            const finalDate = mergeTimePart(mergedDate, selectedTime);

            if (field === "start") {
              setEditItemStartDate(finalDate);
            } else {
              setEditItemEndDate(finalDate);
            }
          },
        });
      },
    });
  };

  const openItemDateTimePicker = (field: "start" | "end") => {
    if (Platform.OS === "android") {
      openAndroidItemDateTimePicker(field);
    } else {
      setShowItemDatePicker(field);
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
        mode="edit"
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
                  onPress={() => openItemDateTimePicker("start")}
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
                  onPress={() => openItemDateTimePicker("end")}
                >
                  <Text style={styles.dateSelectorButtonText}>
                    {editItemEndDate ? formatItemDateTime(editItemEndDate.toISOString()) : "未設定"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            {Platform.OS === "ios" && showItemDatePicker && (
              <View style={styles.datePickerPanel}>
                <DateTimePicker
                  value={
                    showItemDatePicker === "start"
                      ? editItemStartDate ?? new Date()
                      : editItemEndDate ?? new Date()
                  }
                  mode="datetime"
                  is24Hour={true}
                  display="spinner"
                  onChange={handleItemDateChange}
                  locale="ja-JP"
                />
                <TouchableOpacity
                  style={styles.datePickerCloseButton}
                  onPress={() => setShowItemDatePicker(null)}
                >
                  <Text style={styles.datePickerCloseButtonText}>閉じる</Text>
                </TouchableOpacity>
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

export default HomeScreen;
