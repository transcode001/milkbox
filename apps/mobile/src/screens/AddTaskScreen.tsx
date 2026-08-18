import { View, Text, TouchableOpacity, TextInput, ScrollView, Platform, Modal, Keyboard, KeyboardAvoidingView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from "@expo/vector-icons";
import { DEFAULT_REMINDER_MINUTES, NONE_REMINDER_VALUE, REMINDER_OPTIONS } from "@milkbox/shared";
import { styles } from "../styles/screens/AddTaskScreen.styles";
import { modalStyles } from "../styles/modalStyles";
import { colors } from "../styles/tokens";
import type { RootStackParamList } from "../navigation/types";
import { useDatabaseManager } from "../contexts/DatabaseContext";
import { useCategory } from "../hooks/useCategory";
import { useDatePicker } from "../hooks/useDatePicker";
import {
  isEndDateBeforeStartDate,
  resolveScheduleWeekdays,
  toSavedDate,
} from "../utils/dateValidation";
import { parseWeekdays, WEEKDAY_LABELS } from "../utils/weekdays";
import { WeekdayButtonGroup } from "../components/WeekdayButtonGroup";
import { SelectModal, type SelectOption } from "../components/SelectModal";
import { CategoryEditorModal } from "../components/CategoryEditorModal";

type Props = NativeStackScreenProps<RootStackParamList, "AddTask">;
const DEFAULT_CATEGORY_WEEKDAYS = [1, 2, 3, 4, 5];
const REMINDER_SELECT_OPTIONS: SelectOption[] = REMINDER_OPTIONS
  .filter((option) => option.minutes !== NONE_REMINDER_VALUE)
  .map((option) => ({ value: option.minutes.toString(), label: option.label }));

const AddTaskScreen = ({ navigation }: Props) => {
  const { dbManager } = useDatabaseManager();
  const {
    categories,
    selectedOption,
    selectedCategoryName,
    noCategoryChecked,
    showAddCategoryModal,
    newCategoryName,
    setSelectedOption,
    setNoCategoryChecked,
    setShowAddCategoryModal,
    setNewCategoryName,
    loadCategories,
    handleAddCategory,
    handleUpdateCategory,
    handleDeleteCategory,
  } = useCategory({ dbManager });
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
    formatDate,
    formatTime,
  } = useDatePicker();
  const [text, setText] = useState("");
  const [showPostSubmitModal, setShowPostSubmitModal] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [newCategoryWeekdays, setNewCategoryWeekdays] = useState<number[]>(DEFAULT_CATEGORY_WEEKDAYS);
  const [notificationMinutesBefore, setNotificationMinutesBefore] = useState(DEFAULT_REMINDER_MINUTES);
  const [isCategoryListOpen, setIsCategoryListOpen] = useState(false);
  const [isReminderListOpen, setIsReminderListOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{
    id: number;
    name: string;
    weekdays: number[];
  } | null>(null);
  const lastReminderMinutesRef = useRef(DEFAULT_REMINDER_MINUTES);

  const closeCategoryList = useCallback(() => {
    setIsCategoryListOpen(false);
  }, []);
  const closeReminderList = useCallback(() => {
    setIsReminderListOpen(false);
  }, []);
  const closeAddCategoryModal = useCallback(() => {
    setNewCategoryName("");
    setNewCategoryWeekdays(DEFAULT_CATEGORY_WEEKDAYS);
    setShowAddCategoryModal(false);
  }, [setNewCategoryName, setShowAddCategoryModal]);

  const inheritedWeekdays = useMemo(
    () => parseWeekdays(categories.find((category) => category.id.toString() === selectedOption)?.weekdays),
    [categories, selectedOption],
  );
  const hasSelectedDate = startHasDate || endHasDate;
  const effectiveWeekdays = resolveScheduleWeekdays(hasSelectedDate, inheritedWeekdays);
  const inheritedWeekdayLabel = inheritedWeekdays.length > 0
    ? inheritedWeekdays.map((weekday) => WEEKDAY_LABELS[weekday]).join("・")
    : null;
  const selectedReminderLabel = REMINDER_OPTIONS.find(
    (option) => option.minutes === notificationMinutesBefore,
  )?.label ?? "30分前";
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

  const openCategoryEditor = (option: SelectOption) => {
    const category = categories.find((candidate) => candidate.id.toString() === option.value);
    if (!category) return;

    closeCategoryList();
    setEditingCategory({
      id: category.id,
      name: category.name,
      weekdays: parseWeekdays(category.weekdays),
    });
  };

  const submitCategoryUpdate = async () => {
    if (!editingCategory) return;
    const updated = await handleUpdateCategory(
      editingCategory.id,
      editingCategory.name,
      editingCategory.weekdays,
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
          text: "未分類へ移動",
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
      setCategoryError("タスクを選択してください");
      return;
    }

    if (isEndDateBeforeStartDate(startDate, endDate, startHasTime, endHasTime)) {
      setDateError("終了日時が開始日時より前です。終了日時を再設定してください。");
      return;
    }

    const fallbackDate = startDate ?? endDate ?? new Date();
    const notificationEnabled = notificationMinutesBefore !== NONE_REMINDER_VALUE;

    try {
      await dbManager.createItem({
        text: text.trim(),
        date: fallbackDate.toISOString(),
        startDate: startDate ? toSavedDate(startDate, startHasTime) : undefined,
        endDate: endDate ? toSavedDate(endDate, endHasTime) : undefined,
        weekdays:
          !noCategoryChecked && effectiveWeekdays.length > 0
            ? JSON.stringify(effectiveWeekdays)
            : undefined,
        categoryId: noCategoryChecked ? undefined : Number(selectedOption),
        notificationEnabled,
        notificationMinutesBefore,
      });

      setText("");
      clearDate("start");
      clearDate("end");
      setNotificationMinutesBefore(DEFAULT_REMINDER_MINUTES);
      lastReminderMinutesRef.current = DEFAULT_REMINDER_MINUTES;
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
    };

    void initDatabase();
  }, [loadCategories]);

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
            <Text style={styles.modalMessage}>続けて予定を登録しますか？</Text>
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

      <Modal
        visible={showAddCategoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeAddCategoryModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>カテゴリを追加</Text>
            <TextInput
              style={styles.modalInput}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="カテゴリ名を入力"
              returnKeyType="done"
              onSubmitEditing={() => {
                Keyboard.dismiss();
                void submitNewCategory();
              }}
            />
            <Text style={styles.modalFieldLabel}>曜日</Text>
            <Text style={styles.modalFieldHelp}>このカテゴリで繰り返す曜日を選択してください。</Text>
            <View style={styles.modalWeekdayGroup}>
              <WeekdayButtonGroup
                selectedWeekdays={newCategoryWeekdays}
                onToggleWeekday={toggleNewCategoryWeekday}
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={closeAddCategoryModal}
              >
                <Text style={[styles.modalButtonText, modalStyles.modalButtonCancelText]}>
                  キャンセル
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={() => {
                  void submitNewCategory();
                }}
              >
                <Text style={styles.modalButtonText}>追加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CategoryEditorModal
        visible={editingCategory !== null}
        name={editingCategory?.name ?? ""}
        weekdays={editingCategory?.weekdays ?? []}
        onChangeName={(name) => {
          setEditingCategory((current) => current ? { ...current, name } : current);
        }}
        onToggleWeekday={toggleEditingCategoryWeekday}
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
                      setNoCategoryChecked((prev) => {
                        const next = !prev;
                        if (next) {
                          closeCategoryList();
                        }
                        return next;
                      });
                      setCategoryError(null);
                      setDateError(null);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkbox, noCategoryChecked && styles.checkboxChecked]}>
                      {noCategoryChecked ? <Text style={styles.checkboxMark}>✓</Text> : null}
                    </View>
                    <Text style={styles.checkboxLabel}>タスク指定しない</Text>
                  </TouchableOpacity>

                  <SelectModal
                    options={categoryOptions}
                    selectedValue={selectedOption}
                    selectedLabel={selectedOption ? selectedCategoryName : "タスクを選択"}
                    isOpen={isCategoryListOpen}
                    disabled={noCategoryChecked}
                    accessibilityLabel="カテゴリを選択"
                    emptyLabel="カテゴリがありません"
                    onToggle={() => setIsCategoryListOpen((current) => !current)}
                    onClose={closeCategoryList}
                    onSelect={(value) => {
                      setSelectedOption(value);
                      setCategoryError(null);
                      setDateError(null);
                      closeCategoryList();
                    }}
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

                  <View style={styles.dateRow}>
                    <View>
                      <Text style={styles.dateLabel}>開始</Text>
                      <View style={styles.dateControlRow}>
                        <TouchableOpacity
                          style={styles.dateSelectorButton}
                          onPress={() => openDatePicker("start", "date")}
                        >
                          <Text style={styles.dateSelectorButtonText}>
                            {startDate && startHasDate ? formatDate(startDate) : "日付"}
                          </Text>
                        </TouchableOpacity>
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
                    <View>
                      <Text style={styles.dateLabel}>終了</Text>
                      <View style={styles.dateControlRow}>
                        <TouchableOpacity
                          style={styles.dateSelectorButton}
                          onPress={() => openDatePicker("end", "date")}
                        >
                          <Text style={styles.dateSelectorButtonText}>
                            {endDate && endHasDate ? formatDate(endDate) : "日付"}
                          </Text>
                        </TouchableOpacity>
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
                    <Text style={styles.dateLabel}>通知タイミング</Text>
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => {
                        setNotificationMinutesBefore((current) => {
                          if (current === NONE_REMINDER_VALUE) {
                            return lastReminderMinutesRef.current;
                          }
                          lastReminderMinutesRef.current = current;
                          return NONE_REMINDER_VALUE;
                        });
                        closeReminderList();
                      }}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          notificationMinutesBefore === NONE_REMINDER_VALUE && styles.checkboxChecked,
                        ]}
                      >
                        {notificationMinutesBefore === NONE_REMINDER_VALUE ? (
                          <Text style={styles.checkboxMark}>✓</Text>
                        ) : null}
                      </View>
                      <Text style={styles.checkboxLabel}>通知を設定しない</Text>
                    </TouchableOpacity>
                    <SelectModal
                      options={REMINDER_SELECT_OPTIONS}
                      selectedValue={notificationMinutesBefore.toString()}
                      selectedLabel={selectedReminderLabel}
                      isOpen={isReminderListOpen}
                      disabled={notificationMinutesBefore === NONE_REMINDER_VALUE}
                      accessibilityLabel="通知タイミングを選択"
                      onToggle={() => setIsReminderListOpen((current) => !current)}
                      onClose={closeReminderList}
                      onSelect={(value) => {
                        setNotificationMinutesBefore(Number(value));
                        closeReminderList();
                      }}
                    />
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
