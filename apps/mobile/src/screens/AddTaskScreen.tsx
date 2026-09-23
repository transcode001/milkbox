import { SignatureSelector } from "../components/SignatureSelector";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Platform, Modal, Keyboard, KeyboardAvoidingView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from "@expo/vector-icons";
import { DEFAULT_PRIORITY, DEFAULT_REMINDER_MINUTES, type Priority, type Recurrence } from "@milkbox/shared";
import { styles } from "../styles/screens/AddTaskScreen.styles";
import { modalStyles } from "../styles/modalStyles";
import { colors } from "../styles/tokens";
import type { RootStackParamList } from "../navigation/types";
import { useDatabaseManager } from "../contexts/DatabaseContext";
import { useCategory } from "../hooks/useCategory";
import { useTags } from "../hooks/useTags";
import { useDatePicker } from "../hooks/useDatePicker";
import { REMINDER_SELECT_OPTIONS, useReminderPicker } from "../hooks/useReminderPicker";
import {
  isEndDateBeforeStartDate,
  resolveScheduleWeekdays,
  stripDateForTimeOnlyComparison,
  toSavedDate,
} from "../utils/dateValidation";
import { parseWeekdays, WEEKDAY_LABELS } from "../utils/weekdays";
import { SelectModal, type SelectOption } from "../components/SelectModal";
import { DEFAULT_CATEGORY_ICON } from "../constants/categoryIcons";
import { CategoryEditorModal } from "../components/CategoryEditorModal";
import { ColorPicker } from "../components/ColorPicker";
import { PriorityButtonGroup } from "../components/PriorityButtonGroup";
import { TagEditor } from "../components/TagEditor";
import { RecurrenceEditor } from "../components/RecurrenceEditor";
import { DEFAULT_COLORS } from "../constants/colors";

type Props = NativeStackScreenProps<RootStackParamList, "AddTask">;
const DEFAULT_CATEGORY_WEEKDAYS = [1, 2, 3, 4, 5];

// ベルアイコンで示す「通知タイミング」欄の有効時の色。HomeScreen(編集モーダル・
// 一覧のベルアイコン)と同じくFigma上のraw hexで、textPrimary(黒)/textSecondary
// (#666)どちらのトークンとも一致しないためそのまま踏襲している。
const NOTIFICATION_ENABLED_COLOR = "#333";

const AddTaskScreen = ({ navigation }: Props) => {
  const { dbManager } = useDatabaseManager();
  const {
    categories,
    selectedOption,
    selectedCategoryName,
    noCategoryChecked,
    showAddCategoryModal,
    newCategoryName,
    newCategoryColor,
    newCategoryIcon,
    setNewCategoryIcon,
    setSelectedOption,
    setNoCategoryChecked,
    setShowAddCategoryModal,
    setNewCategoryName,
    setNewCategoryColor,
    loadCategories,
    handleAddCategory,
    handleUpdateCategory,
    handleDeleteCategory,
  } = useCategory({ dbManager });
  const { tags, loadTags, createTag } = useTags({ dbManager });
  const {
    startDate,
    endDate,
    startHasDate,
    endHasDate,
    startHasTime,
    endHasTime,
    activeDatePicker,
    setActiveDatePicker,
    onDateChange,
    openDatePicker,
    clearDate,
    clearDatePart,
    formatDate,
    formatTime,
  } = useDatePicker();
  const [text, setText] = useState("");
  const [taskColor, setTaskColor] = useState<string>(DEFAULT_COLORS.task);
  const [priority, setPriority] = useState<Priority>(DEFAULT_PRIORITY);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [recurrence, setRecurrence] = useState<Recurrence | null>(null);
  const [showPostSubmitModal, setShowPostSubmitModal] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [newCategoryWeekdays, setNewCategoryWeekdays] = useState<number[]>(DEFAULT_CATEGORY_WEEKDAYS);
  const reminder = useReminderPicker(DEFAULT_REMINDER_MINUTES);
  const [isCategoryListOpen, setIsCategoryListOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{
    id: number;
    name: string;
    weekdays: number[];
    color: string;
    icon?: string;
  } | null>(null);

  const closeCategoryList = useCallback(() => {
    setIsCategoryListOpen(false);
  }, []);
  const closeAddCategoryModal = useCallback(() => {
    setNewCategoryName("");
    setNewCategoryColor(DEFAULT_COLORS.category);
    setNewCategoryIcon(DEFAULT_CATEGORY_ICON);
    setNewCategoryWeekdays(DEFAULT_CATEGORY_WEEKDAYS);
    setShowAddCategoryModal(false);
  }, [setNewCategoryIcon, setNewCategoryColor, setNewCategoryName, setShowAddCategoryModal]);

  const inheritedWeekdays = useMemo(
    () => parseWeekdays(categories.find((category) => category.id.toString() === selectedOption)?.weekdays),
    [categories, selectedOption],
  );
  // 隔週/毎月/N日ごとはカテゴリ選択中でも起点の日付(日付ボタン)が必要になる。
  const showDatePicker = noCategoryChecked || recurrence !== null;
  const hasSelectedDate = noCategoryChecked && (startHasDate || endHasDate);
  const effectiveWeekdays = resolveScheduleWeekdays(hasSelectedDate, inheritedWeekdays);
  const inheritedWeekdayLabel = inheritedWeekdays.length > 0
    ? inheritedWeekdays.map((weekday) => WEEKDAY_LABELS[weekday]).join("・")
    : null;
  const categoryOptions = useMemo<SelectOption[]>(
    () => categories.map((category) => ({
      value: category.id.toString(),
      label: category.name,
    })),
    [categories],
  );
  const toggleNewCategoryWeekday = (weekday: number) => {
    setNewCategoryWeekdays((current) =>
      current.includes(weekday)
        ? current.filter((value) => value !== weekday)
        : [...current, weekday].sort((left, right) => left - right),
    );
  };

  const toggleEditingCategoryWeekday = (weekday: number) => {
    setEditingCategory((current) => {
      if (!current) return current;
      const weekdays = current.weekdays.includes(weekday)
        ? current.weekdays.filter((value) => value !== weekday)
        : [...current.weekdays, weekday].sort((left, right) => left - right);
      return { ...current, weekdays };
    });
  };

  const submitNewCategory = async () => {
    const added = await handleAddCategory(newCategoryWeekdays);
    if (added) {
      setNewCategoryWeekdays(DEFAULT_CATEGORY_WEEKDAYS);
    }
  };

  const selectCategory = (value: string) => {
    setSelectedOption(value);
    setCategoryError(null);
    setDateError(null);
    closeCategoryList();
  };

  const openCategoryEditor = (option: SelectOption) => {
    const category = categories.find((candidate) => candidate.id.toString() === option.value);
    if (!category) return;

    closeCategoryList();
    setEditingCategory({
      id: category.id,
      name: category.name,
      weekdays: parseWeekdays(category.weekdays),
      color: category.color,
      icon: category.icon,
    });
  };

  const submitCategoryUpdate = async () => {
    if (!editingCategory) return;
    const updated = await handleUpdateCategory(
      editingCategory.id,
      editingCategory.name,
      editingCategory.weekdays,
      editingCategory.color,
      editingCategory.icon,
    );
    if (updated) {
      setEditingCategory(null);
    }
  };

  const confirmCategoryDeletion = (option: SelectOption) => {
    const categoryId = Number(option.value);
    closeCategoryList();
    Alert.alert(
      "カテゴリを削除",
      `「${option.label}」に含まれるタスクをどうしますか？`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "カテゴリ指定なしへ移動",
          onPress: () => void handleDeleteCategory(categoryId, "uncategorize"),
        },
        {
          text: "タスクも削除",
          style: "destructive",
          onPress: () => void handleDeleteCategory(categoryId, "delete"),
        },
      ],
    );
  };

  const handleSubmit = async () => {
    setDateError(null);
    setCategoryError(null);

    if (!text.trim()) return;

    if (!noCategoryChecked && !selectedOption) {
      setCategoryError("カテゴリを指定してください");
      return;
    }

    if (recurrence && !startHasDate) {
      setDateError("繰り返しには開始日を設定してください");
      return;
    }

    // 繰り返し設定時は、通常カテゴリ選択時に使う「時刻だけ比較(日付部分を無視)」ではなく
    // noCategoryChecked時と同じ「日付込み」の比較に揃える。
    const validationStartDate = showDatePicker ? startDate : stripDateForTimeOnlyComparison(startDate);
    const validationEndDate = showDatePicker ? endDate : stripDateForTimeOnlyComparison(endDate);

    if (isEndDateBeforeStartDate(validationStartDate, validationEndDate, startHasTime, endHasTime)) {
      setDateError("終了日時が開始日時より前です。終了日時を再設定してください。");
      return;
    }

    const fallbackDate = startDate ?? endDate ?? new Date();

    try {
      await dbManager.createItem({
        text: text.trim(),
        date: fallbackDate.toISOString(),
        startDate:
          startDate && (startHasTime || (showDatePicker && startHasDate))
            ? toSavedDate(startDate, startHasTime)
            : undefined,
        endDate:
          endDate && (endHasTime || (showDatePicker && endHasDate))
            ? toSavedDate(endDate, endHasTime)
            : undefined,
        weekdays:
          !noCategoryChecked && !recurrence && effectiveWeekdays.length > 0
            ? JSON.stringify(effectiveWeekdays)
            : undefined,
        categoryId: noCategoryChecked ? undefined : Number(selectedOption),
        notificationEnabled: reminder.notificationEnabled,
        notificationMinutesBefore: reminder.notificationMinutesBefore,
        color: noCategoryChecked ? taskColor : DEFAULT_COLORS.task,
        priority,
        tagIds: selectedTagIds,
        recurrence: recurrence ?? undefined,
      });

      setText("");
      setTaskColor(DEFAULT_COLORS.task);
      setPriority(DEFAULT_PRIORITY);
      setSelectedTagIds([]);
      setRecurrence(null);
      clearDate("start");
      clearDate("end");
      reminder.resetReminder(DEFAULT_REMINDER_MINUTES, true);
      setActiveDatePicker(null);
      closeCategoryList();
      setShowPostSubmitModal(true);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to save data");
    }
  };

  useEffect(() => {
    const initDatabase = async () => {
      await loadCategories();
      await loadTags();
    };

    void initDatabase();
  }, [loadCategories, loadTags]);

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
    );
  };

  const addNewTag = async (name: string): Promise<boolean> => {
    const tag = await createTag(name);
    if (!tag) return false;
    setSelectedTagIds((current) => (current.includes(tag.id) ? current : [...current, tag.id]));
    return true;
  };

  const pickerValue = activeDatePicker?.field === "start" ? startDate ?? new Date() : endDate ?? new Date();
  const pickerDisplay = Platform.OS === "ios"
    ? activeDatePicker?.mode === "time" ? "spinner" : "inline"
    : activeDatePicker?.mode === "time" ? "clock" : "calendar";

  return (
    <SafeAreaView style={styles.container}>
      <Modal
        visible={showPostSubmitModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>登録完了</Text>
            <Text style={styles.modalMessage}>続けてタスクまたはカテゴリを登録しますか？</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowPostSubmitModal(false)}
                style={[styles.modalButton, styles.modalButtonCancel]}
              >
                <Text style={[styles.modalButtonText, modalStyles.modalButtonCancelText]}>
                  続けて登録する
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowPostSubmitModal(false);
                  navigation.popTo("Tabs", { screen: "Home" });
                }}
                style={[styles.modalButton, styles.modalButtonSubmit]}
              >
                <Text style={styles.modalButtonText}>ホームへ戻る</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CategoryEditorModal
        visible={showAddCategoryModal}
        mode="add"
        name={newCategoryName}
        weekdays={newCategoryWeekdays}
        color={newCategoryColor}
        icon={newCategoryIcon}
        onChangeIcon={setNewCategoryIcon}
        onChangeName={setNewCategoryName}
        onToggleWeekday={toggleNewCategoryWeekday}
        onChangeColor={setNewCategoryColor}
        onCancel={closeAddCategoryModal}
        onSave={() => void submitNewCategory()}
      />

      <CategoryEditorModal
        visible={editingCategory !== null}
        mode="edit"
        name={editingCategory?.name ?? ""}
        weekdays={editingCategory?.weekdays ?? []}
        color={editingCategory?.color ?? DEFAULT_COLORS.category}
        icon={editingCategory?.icon}
        onChangeIcon={(icon) => setEditingCategory(current => current ? { ...current, icon } : current)}
        onChangeName={(name) => {
          setEditingCategory((current) => current ? { ...current, name } : current);
        }}
        onToggleWeekday={toggleEditingCategoryWeekday}
        onChangeColor={(color) => {
          setEditingCategory((current) => current ? { ...current, color } : current);
        }}
        onCancel={() => setEditingCategory(null)}
        onSave={() => void submitCategoryUpdate()}
      />

        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          >
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>カテゴリ</Text>

                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => {
                      const next = !noCategoryChecked;
                      setNoCategoryChecked(next);
                      if (next) {
                        closeCategoryList();
                      } else {
                        clearDatePart("start");
                        clearDatePart("end");
                        setActiveDatePicker(null);
                      }
                      setCategoryError(null);
                      setDateError(null);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkbox, noCategoryChecked && styles.checkboxChecked]}>
                      {noCategoryChecked ? <Text style={styles.checkboxMark}>✓</Text> : null}
                    </View>
                    <Text style={styles.checkboxLabel}>カテゴリ指定しない</Text>
                  </TouchableOpacity>

                  <SelectModal
                    options={categoryOptions}
                    selectedValue={selectedOption}
                    selectedLabel={selectedOption ? selectedCategoryName : "カテゴリを選択"}
                    isOpen={isCategoryListOpen}
                    disabled={noCategoryChecked}
                    accessibilityLabel="カテゴリを選択"
                    emptyLabel="カテゴリがありません"
                    onToggle={() => setIsCategoryListOpen((current) => !current)}
                    onClose={closeCategoryList}
                    onSelect={selectCategory}
                    renderOptionAction={(option) => (
                      <View style={styles.categoryActions}>
                        <TouchableOpacity
                          style={styles.categoryActionButton}
                          onPress={() => openCategoryEditor(option)}
                          accessibilityRole="button"
                          accessibilityLabel={`${option.label}を編集`}
                        >
                          <Ionicons name="pencil-outline" size={19} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.categoryActionButton}
                          onPress={() => confirmCategoryDeletion(option)}
                          accessibilityRole="button"
                          accessibilityLabel={`${option.label}を削除`}
                        >
                          <Ionicons name="trash-outline" size={19} color={colors.destructive} />
                        </TouchableOpacity>
                      </View>
                    )}
                    footer={(
                      <TouchableOpacity
                        style={styles.addCategoryOption}
                        onPress={() => {
                          closeCategoryList();
                          setShowAddCategoryModal(true);
                        }}
                        accessibilityRole="button"
                      >
                        <Ionicons name="add" size={20} color={colors.primary} />
                        <Text style={styles.addCategoryOptionText}>カテゴリを追加</Text>
                      </TouchableOpacity>
                    )}
                  />

                  {!noCategoryChecked && <SignatureSelector categories={categories} selectedValue={selectedOption} onSelect={selectCategory} />}

                  {categoryError && <Text style={styles.errorText}>{categoryError}</Text>}
                  {!noCategoryChecked && selectedOption ? (
                    <Text style={styles.categoryWeekdayHelp}>
                      {inheritedWeekdayLabel
                        ? hasSelectedDate
                          ? `カテゴリの曜日設定は${inheritedWeekdayLabel}です。日付指定時は使用しません。`
                          : `曜日はカテゴリの設定（${inheritedWeekdayLabel}）を引き継ぎます。`
                        : "このカテゴリには繰り返す曜日が設定されていません。"}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.formContainer}>
                  <TextInput
                    style={styles.textarea}
                    value={text}
                    onChangeText={setText}
                    placeholder="テキストを入力"
                    multiline
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={Keyboard.dismiss}
                  />

                  {noCategoryChecked ? (
                    <View style={styles.colorPickerContainer}>
                      <Text style={styles.dateLabel}>タスクの色</Text>
                      <ColorPicker
                        value={taskColor}
                        defaultColor={DEFAULT_COLORS.task}
                        onChange={setTaskColor}
                      />
                    </View>
                  ) : null}

                  <View>
                    <Text style={styles.dateLabel}>優先度</Text>
                    <PriorityButtonGroup value={priority} onChange={setPriority} />
                  </View>

                  <View>
                    <Text style={styles.dateLabel}>タグ</Text>
                    <TagEditor
                      allTags={tags}
                      selectedTagIds={selectedTagIds}
                      onToggleTag={toggleTag}
                      onCreateTag={addNewTag}
                    />
                  </View>

                  <View>
                    <Text style={styles.dateLabel}>繰り返し</Text>
                    <RecurrenceEditor value={recurrence} onChange={setRecurrence} />
                  </View>

                  <View style={styles.dateRow}>
                    <View style={styles.dateFieldRow}>
                      <Text style={styles.dateFieldLabel}>開始</Text>
                      <View style={styles.dateControlRow}>
                        {showDatePicker ? (
                          <TouchableOpacity
                            style={styles.dateSelectorButton}
                            onPress={() => openDatePicker("start", "date")}
                          >
                            <Text style={styles.dateSelectorButtonText}>
                              {startDate && startHasDate ? formatDate(startDate) : "日付"}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                          style={styles.dateSelectorButton}
                          onPress={() => openDatePicker("start", "time")}
                        >
                          <Text style={styles.dateSelectorButtonText}>
                            {startDate && startHasTime ? formatTime(startDate) : "時間"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.dateClearButton}
                          onPress={() => clearDate("start")}
                          disabled={!startDate}
                        >
                          <Text style={styles.dateClearButtonText}>クリア</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.dateFieldRow}>
                      <Text style={styles.dateFieldLabel}>終了</Text>
                      <View style={styles.dateControlRow}>
                        {showDatePicker ? (
                          <TouchableOpacity
                            style={styles.dateSelectorButton}
                            onPress={() => openDatePicker("end", "date")}
                          >
                            <Text style={styles.dateSelectorButtonText}>
                              {endDate && endHasDate ? formatDate(endDate) : "日付"}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                          style={styles.dateSelectorButton}
                          onPress={() => openDatePicker("end", "time")}
                        >
                          <Text style={styles.dateSelectorButtonText}>
                            {endDate && endHasTime ? formatTime(endDate) : "時間"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.dateClearButton}
                          onPress={() => clearDate("end")}
                          disabled={!endDate}
                        >
                          <Text style={styles.dateClearButtonText}>クリア</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {activeDatePicker && (
                    <View style={styles.datePickerPanel}>
                      <DateTimePicker
                        value={pickerValue}
                        mode={activeDatePicker.mode}
                        is24Hour={true}
                        display={pickerDisplay}
                        onChange={onDateChange}
                        locale="ja-JP"
                        minimumDate={new Date(1900, 0, 1)}
                        maximumDate={new Date(2099, 11, 31)}
                        style={styles.datePicker}
                      />
                      {Platform.OS === "ios" && (
                        <TouchableOpacity
                          style={styles.datePickerCloseButton}
                          onPress={() => setActiveDatePicker(null)}
                        >
                          <Text style={styles.datePickerCloseButtonText}>閉じる</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {dateError && <Text style={styles.errorText}>{dateError}</Text>}
                  <View style={styles.reminderContainer}>
                    <View style={styles.notificationRow}>
                      <TouchableOpacity
                        onPress={reminder.toggleReminderEnabled}
                        accessibilityRole="switch"
                        accessibilityLabel="通知タイミング"
                        accessibilityState={{ checked: reminder.notificationEnabled }}
                      >
                        <Ionicons
                          name={reminder.notificationEnabled ? "notifications-outline" : "notifications-off-outline"}
                          size={18}
                          color={reminder.notificationEnabled ? NOTIFICATION_ENABLED_COLOR : colors.textSecondary}
                        />
                      </TouchableOpacity>
                      <View style={styles.notificationDropdown}>
                        <SelectModal
                          options={REMINDER_SELECT_OPTIONS}
                          selectedValue={reminder.notificationMinutesBefore.toString()}
                          selectedLabel={reminder.selectedReminderLabel}
                          isOpen={reminder.isReminderListOpen}
                          disabled={!reminder.notificationEnabled}
                          accessibilityLabel="通知タイミングを選択"
                          onToggle={() => reminder.setIsReminderListOpen((current) => !current)}
                          onClose={() => reminder.setIsReminderListOpen(false)}
                          onSelect={(value) => reminder.selectReminderMinutes(Number(value))}
                        />
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={() => {
                      void handleSubmit();
                    }}
                  >
                    <Text style={styles.buttonText}>タスクを追加する</Text>
                  </TouchableOpacity>
                </View>
          </ScrollView>
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AddTaskScreen;
