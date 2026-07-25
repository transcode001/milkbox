import { View, Text, TouchableOpacity, TextInput, SectionList, Platform, Modal, Keyboard, KeyboardAvoidingView, Alert, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DEFAULT_REMINDER_MINUTES, NONE_REMINDER_VALUE, REMINDER_OPTIONS } from "@milkbox/shared";
import { styles } from "../styles/screens/AddTaskScreen.styles";
import { modalStyles } from "../styles/modalStyles";
import { colors } from "../styles/tokens";
import type { RootStackParamList } from "../navigation/types";
import { useDatabaseManager } from "../contexts/DatabaseContext";
import { DeleteCategoryMode, useCategory } from "../hooks/useCategory";
import { useDatePicker } from "../hooks/useDatePicker";
import { useItemForm } from "../hooks/useItemForm";
import { isEndDateBeforeStartDate } from "../utils/dateValidation";
import { formatWeekdayLabels, parseWeekdays } from "../utils/weekdays";
import { WeekdayButtonGroup } from "../components/WeekdayButtonGroup";

type Props = NativeStackScreenProps<RootStackParamList, "AddTask">;

const formatSavedItemDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const formatSavedItemDateRange = (item: { startDate?: string; endDate?: string; date: string }) => {
  const start = formatSavedItemDate(item.startDate);
  const end = formatSavedItemDate(item.endDate);

  if (start && end) return `${start} ～ ${end}`;
  if (start) return `${start} ～`;
  if (end) return `～ ${end}`;
  return new Date(item.date).toLocaleString();
};

const AddTaskScreen = ({ navigation }: Props) => {
  const { dbManager } = useDatabaseManager();
  const {
    categories,
    selectedOption,
    selectedCategoryName,
    noCategoryChecked,
    showAddCategoryModal,
    showDeleteCategoryModal,
    newCategoryName,
    setSelectedOption,
    setNoCategoryChecked,
    setShowAddCategoryModal,
    setShowDeleteCategoryModal,
    setNewCategoryName,
    loadCategories,
    handleAddCategory,
    handleDeleteCategory,
  } = useCategory({ dbManager });
  const {
    startDate,
    endDate,
    activeDatePicker,
    setActiveDatePicker,
    setStartDate,
    setEndDate,
    onDateChange,
    openDatePicker,
    clearDate,
    formatDate,
    formatTime,
  } = useDatePicker();
  const {
    text,
    items,
    setText,
    loadItems,
    deleteItem,
    toggleItemNotification,
    togglingNotificationItemId,
  } = useItemForm({ dbManager });
  const [showPostSubmitModal, setShowPostSubmitModal] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [notificationMinutesBefore, setNotificationMinutesBefore] = useState(DEFAULT_REMINDER_MINUTES);
  const colorScheme = useColorScheme();
  // Androidのピッカーダイアログは端末テーマに従って背景が暗くなるためダーク時のみ白文字。
  // iOSのホイールは画面（白背景固定）上に直接描画されるので常に濃色でないと見えなくなる。
  const pickerItemColor =
    Platform.OS === "android" && colorScheme === "dark" ? colors.onPrimary : colors.textPrimary;

  const inheritedWeekdays = useMemo(() => {
    if (!selectedOption) return [];

    const weekdaySet = new Set<number>();
    for (const section of items) {
      for (const item of section.data) {
        if (item.categoryId?.toString() !== selectedOption) continue;
        for (const weekday of parseWeekdays(item.weekdays)) {
          weekdaySet.add(weekday);
        }
      }
    }

    return [...weekdaySet].sort((left, right) => left - right);
  }, [items, selectedOption]);
  const effectiveWeekdays = inheritedWeekdays.length > 0 ? inheritedWeekdays : selectedWeekdays;

  const toggleWeekday = (weekday: number) => {
    setSelectedWeekdays((current) =>
      current.includes(weekday)
        ? current.filter((value) => value !== weekday)
        : [...current, weekday].sort((left, right) => left - right),
    );
    setDateError(null);
  };

  const handleDeleteCategoryConfirm = (mode: DeleteCategoryMode) => {
    if (selectedOption) {
      void handleDeleteCategory(mode, loadItems);
      setSelectedOption("");
    }
    setShowDeleteCategoryModal(false);
  };

  const handleSubmit = async () => {
    setDateError(null);
    setCategoryError(null);

    if (!text.trim()) return;

    if (!noCategoryChecked && !selectedOption) {
      setCategoryError("タスクを選択してください");
      return;
    }

    if (isEndDateBeforeStartDate(startDate, endDate)) {
      setDateError("終了日時が開始日時より前です。終了日時を再設定してください。");
      return;
    }

    if (!noCategoryChecked && effectiveWeekdays.length === 0) {
      setDateError("曜日を1つ以上選択してください。");
      return;
    }

    const fallbackDate = startDate ?? endDate ?? new Date();
    const notificationEnabled = notificationMinutesBefore !== NONE_REMINDER_VALUE;

    try {
      await dbManager.createItem({
        text: text.trim(),
        date: fallbackDate.toISOString(),
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        weekdays: noCategoryChecked ? undefined : JSON.stringify(effectiveWeekdays),
        categoryId: noCategoryChecked ? undefined : Number(selectedOption),
        notificationEnabled,
        notificationMinutesBefore,
      });

      setText("");
      setStartDate(null);
      setEndDate(null);
      setSelectedWeekdays([]);
      setNotificationMinutesBefore(DEFAULT_REMINDER_MINUTES);
      setActiveDatePicker(null);
      await loadItems();
      setShowPostSubmitModal(true);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to save data");
    }
  };

  useEffect(() => {
    const initDatabase = async () => {
      await loadCategories();
      await loadItems();
    };

    void initDatabase();
  }, [loadCategories, loadItems]);

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
        visible={showDeleteCategoryModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>タスクを削除</Text>
            <Text style={styles.modalMessage}>
              「{selectedCategoryName}」を削除します。{"\n"}
              登録済みの内容をどうしますか？
            </Text>
            <View style={styles.modalActionStack}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDanger]}
                onPress={() => handleDeleteCategoryConfirm("delete")}
              >
                <Text style={styles.modalButtonText}>削除（アイテムも削除）</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={() => handleDeleteCategoryConfirm("uncategorize")}
              >
                <Text style={styles.modalButtonText}>未分類（アイテムを残す）</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowDeleteCategoryModal(false)}
              >
                <Text style={[styles.modalButtonText, modalStyles.modalButtonCancelText]}>
                  キャンセル
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAddCategoryModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>新しいタスクを追加</Text>
            <TextInput
              style={styles.modalInput}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="タスク名を入力"
              returnKeyType="done"
              onSubmitEditing={() => {
                Keyboard.dismiss();
                handleAddCategory();
              }}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setNewCategoryName("");
                  setShowAddCategoryModal(false);
                }}
              >
                <Text style={[styles.modalButtonText, modalStyles.modalButtonCancelText]}>
                  キャンセル
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={handleAddCategory}
              >
                <Text style={styles.modalButtonText}>追加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <SectionList
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            sections={items}
            keyExtractor={(item) => item.id.toString()}
            stickySectionHeadersEnabled={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            ListHeaderComponent={
              <>
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerHeader}>
                    <Text style={styles.pickerLabel}>タスクを選択:</Text>
                    <View style={styles.pickerActions}>
                      <TouchableOpacity
                        style={styles.addCategoryButton}
                        onPress={() => setShowAddCategoryModal(true)}
                      >
                        <Text style={styles.addCategoryButtonText}>+ 追加</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.removeCategoryButton,
                          !selectedOption && styles.removeCategoryButtonDisabled,
                        ]}
                        onPress={() => {
                          if (!selectedOption) {
                            setCategoryError("削除するタスクを選択してください");
                            return;
                          }
                          setShowDeleteCategoryModal(true);
                        }}
                      >
                        <Text style={styles.removeCategoryButtonText}>削除</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => {
                      setNoCategoryChecked((prev) => {
                        const next = !prev;
                        if (next) {
                          setSelectedWeekdays([]);
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

                  <Picker
                    selectedValue={selectedOption}
                    onValueChange={(itemValue) => {
                      setSelectedOption(itemValue);
                      setCategoryError(null);
                      setDateError(null);
                      setSelectedWeekdays([]);
                    }}
                    enabled={!noCategoryChecked}
                    style={[styles.picker, noCategoryChecked && styles.pickerDisabled]}
                    itemStyle={styles.pickerItem}
                  >
                    {categories.map((category) => (
                      <Picker.Item
                        key={category.id}
                        label={category.name}
                        value={category.id.toString()}
                        color={pickerItemColor}
                      />
                    ))}
                  </Picker>
                  {categoryError && <Text style={styles.errorText}>{categoryError}</Text>}
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
                      <Text style={styles.dateLabel}>開始日時</Text>
                      <View style={styles.dateControlRow}>
                        <TouchableOpacity
                          style={styles.dateSelectorButton}
                          onPress={() => openDatePicker("start", "date")}
                        >
                          <Text style={styles.dateSelectorButtonText}>
                            {startDate ? formatDate(startDate) : "日付"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.dateSelectorButton}
                          onPress={() => openDatePicker("start", "time")}
                        >
                          <Text style={styles.dateSelectorButtonText}>
                            {startDate ? formatTime(startDate) : "時間"}
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
                      <Text style={styles.dateLabel}>終了日時</Text>
                      <View style={styles.dateControlRow}>
                        <TouchableOpacity
                          style={styles.dateSelectorButton}
                          onPress={() => openDatePicker("end", "date")}
                        >
                          <Text style={styles.dateSelectorButtonText}>
                            {endDate ? formatDate(endDate) : "日付"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.dateSelectorButton}
                          onPress={() => openDatePicker("end", "time")}
                        >
                          <Text style={styles.dateSelectorButtonText}>
                            {endDate ? formatTime(endDate) : "時間"}
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

                  {!noCategoryChecked && (
                    <View style={styles.weekdayContainer}>
                      <Text style={styles.dateLabel}>曜日</Text>
                      {inheritedWeekdays.length > 0 ? (
                        <Text style={styles.weekdayHelpText}>
                          このタスクの登録済み曜日（{formatWeekdayLabels(JSON.stringify(inheritedWeekdays))}）を引き継ぎます。
                        </Text>
                      ) : null}
                      <WeekdayButtonGroup
                        selectedWeekdays={effectiveWeekdays}
                        onToggleWeekday={toggleWeekday}
                        disabled={inheritedWeekdays.length > 0}
                      />
                    </View>
                  )}
                  {dateError && <Text style={styles.errorText}>{dateError}</Text>}
                  <View style={styles.reminderContainer}>
                    <Text style={styles.dateLabel}>通知タイミング</Text>
                    <Picker
                      selectedValue={notificationMinutesBefore}
                      onValueChange={(value) => setNotificationMinutesBefore(Number(value))}
                      style={styles.reminderPicker}
                      itemStyle={styles.reminderPickerItem}
                    >
                      {REMINDER_OPTIONS.map((option) => (
                        <Picker.Item
                          key={option.minutes}
                          label={option.label}
                          value={option.minutes}
                          color={pickerItemColor}
                        />
                      ))}
                    </Picker>
                  </View>
                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={() => {
                      void handleSubmit();
                    }}
                  >
                    <Text style={styles.buttonText}>送信</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.listContainer}>
                  <Text style={styles.listTitle}>
                    保存済みタスク ({items.reduce((sum, section) => sum + section.data.length, 0)}):
                  </Text>
                </View>
              </>
            }
            renderSectionHeader={({ section: { title } }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{title}</Text>
              </View>
            )}
            renderItem={({ item }) => (
              <View style={styles.itemContainer}>
                <View style={styles.itemTextContainer}>
                  <Text style={styles.itemText}>{item.text}</Text>
                  <Text style={styles.itemDate}>
                    {formatWeekdayLabels(item.weekdays) ?? formatSavedItemDateRange(item)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => {
                    void toggleItemNotification(item.id, !item.notificationEnabled);
                  }}
                  disabled={togglingNotificationItemId !== null}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, item.notificationEnabled && styles.checkboxChecked]}>
                    {item.notificationEnabled ? <Text style={styles.checkboxMark}>✓</Text> : null}
                  </View>
                  <Text style={styles.checkboxLabel}>通知</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteItem(item.id)}
                >
                  <Text style={styles.deleteButtonText}>削除</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyListText}>保存済みの予定はまだありません。</Text>}
          />
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AddTaskScreen;
