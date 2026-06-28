import { View, Text, TouchableOpacity, TextInput, SectionList, Platform, Modal, useWindowDimensions, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useMemo, useState } from "react";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { styles } from "../styles/screens/AddTaskScreen.styles";
import type { RootTabParamList } from "../navigation/types";
import { useDatabaseManager } from "../contexts/DatabaseContext";
import { DeleteCategoryMode, useCategory } from "../hooks/useCategory";
import { useDatePicker } from "../hooks/useDatePicker";
import { useItemForm } from "../hooks/useItemForm";
import { isEndDateBeforeStartDate } from "../utils/dateValidation";
import { formatWeekdayLabels, parseWeekdays } from "../utils/weekdays";

type Props = BottomTabScreenProps<RootTabParamList, "AddTask">;

const WEEKDAY_OPTIONS = [
  { value: 0, label: "日" },
  { value: 1, label: "月" },
  { value: 2, label: "火" },
  { value: 3, label: "水" },
  { value: 4, label: "木" },
  { value: 5, label: "金" },
  { value: 6, label: "土" },
] as const;

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
  const { width } = useWindowDimensions();
  const isNarrowScreen = width < 360;
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
  const { text, items, setText, loadItems, deleteItem } = useItemForm({ dbManager });
  const [showPostSubmitModal, setShowPostSubmitModal] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);

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

    try {
      await dbManager.createItem({
        text: text.trim(),
        date: fallbackDate.toISOString(),
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        weekdays: noCategoryChecked ? undefined : JSON.stringify(effectiveWeekdays),
        categoryId: noCategoryChecked ? undefined : Number(selectedOption),
      });

      setText("");
      setStartDate(null);
      setEndDate(null);
      setSelectedWeekdays([]);
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
                <Text style={styles.modalButtonText}>続けて登録する</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowPostSubmitModal(false);
                  navigation.navigate("Home");
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
                <Text style={styles.modalButtonText}>キャンセル</Text>
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
                <Text style={styles.modalButtonText}>キャンセル</Text>
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

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
                    placeholder="Enter text here"
                    multiline
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={Keyboard.dismiss}
                  />

                  <View style={[styles.dateRow, isNarrowScreen && styles.dateRowStacked]}>
                    <View style={styles.dateColumn}>
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
                    <View style={styles.dateColumn}>
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
                      <View style={styles.weekdayRow}>
                        {WEEKDAY_OPTIONS.map((weekday) => {
                          const selected = effectiveWeekdays.includes(weekday.value);
                          const disabled = inheritedWeekdays.length > 0;

                          return (
                            <TouchableOpacity
                              key={weekday.value}
                              style={[
                                styles.weekdayButton,
                                selected && styles.weekdayButtonSelected,
                                disabled && !selected && styles.weekdayButtonDisabled,
                              ]}
                              onPress={() => toggleWeekday(weekday.value)}
                              disabled={disabled}
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
                    </View>
                  )}
                  {dateError && <Text style={styles.errorText}>{dateError}</Text>}
                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={() => {
                      void handleSubmit();
                    }}
                  >
                    <Text style={styles.buttonText}>Submit</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.listContainer}>
                  <Text style={styles.listTitle}>
                    Saved Tasks ({items.reduce((sum, section) => sum + section.data.length, 0)}):
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
                  style={styles.deleteButton}
                  onPress={() => deleteItem(item.id)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyListText}>保存済みの予定はまだありません。</Text>}
          />
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

export default AddTaskScreen;
