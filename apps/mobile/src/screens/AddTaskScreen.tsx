import { View, Text, TouchableOpacity, TextInput, SectionList, Platform, Modal, useWindowDimensions, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect } from "react";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { styles } from "../styles/screens/AddTaskScreen.styles";
import type { RootTabParamList } from "../navigation/types";
import { useDatabaseManager } from "../contexts/DatabaseContext";
import { useCategory } from "../hooks/useCategory";
import { useDatePicker } from "../hooks/useDatePicker";
import { useItemForm } from "../hooks/useItemForm";

type Props = BottomTabScreenProps<RootTabParamList, "AddTask">;

const AddTaskScreen = ({ navigation }: Props) => {
  const { width } = useWindowDimensions();
  const isNarrowScreen = width < 360;
  const dbManager = useDatabaseManager();
  const {
    categories,
    selectedOption,
    noCategoryChecked,
    showAddCategoryModal,
    newCategoryName,
    setSelectedOption,
    setNoCategoryChecked,
    setShowAddCategoryModal,
    setNewCategoryName,
    loadCategories,
    handleAddCategory,
    showDeleteCategoryDialog,
  } = useCategory({ dbManager });
  const {
    startDate,
    endDate,
    activeDateField,
    setActiveDateField,
    setStartDate,
    setEndDate,
    onDateChange,
    openDatePicker,
    clearDate,
    formatDate,
  } = useDatePicker();
  const { text, items, setText, loadItems, handleSubmit, deleteItem } = useItemForm({
    dbManager,
    selectedOption,
    noCategoryChecked,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    setActiveDateField,
    onNavigateHome: () => navigation.navigate("Home"),
  });

  useEffect(() => {
    const initDatabase = async () => {
      await loadCategories();
      await loadItems();
    };

    void initDatabase();
  }, [loadCategories, loadItems]);

  return (
    <SafeAreaView style={styles.container}>
      <Modal
        visible={showAddCategoryModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>新しいカテゴリを追加</Text>
            <TextInput
              style={styles.modalInput}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="カテゴリ名を入力"
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
                <Text style={styles.pickerLabel}>カテゴリを選択:</Text>
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
                    onPress={() => showDeleteCategoryDialog(loadItems)}
                    disabled={!selectedOption}
                  >
                    <Text style={styles.removeCategoryButtonText}>削除</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setNoCategoryChecked((prev) => !prev)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, noCategoryChecked && styles.checkboxChecked]}>
                  {noCategoryChecked ? <Text style={styles.checkboxMark}>✓</Text> : null}
                </View>
                <Text style={styles.checkboxLabel}>カテゴリ指定しない</Text>
              </TouchableOpacity>

              <Picker
                selectedValue={selectedOption}
                onValueChange={(itemValue) => setSelectedOption(itemValue)}
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
                    <Text style={styles.dateLabel}>開始日</Text>
                    <View style={styles.dateControlRow}>
                      <TouchableOpacity
                        style={styles.dateSelectorButton}
                        onPress={() => openDatePicker("start")}
                      >
                        <Text style={styles.dateSelectorButtonText}>
                          {startDate ? formatDate(startDate) : "設定しない"}
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
                    <Text style={styles.dateLabel}>終了日</Text>
                    <View style={styles.dateControlRow}>
                      <TouchableOpacity
                        style={styles.dateSelectorButton}
                        onPress={() => openDatePicker("end")}
                      >
                        <Text style={styles.dateSelectorButtonText}>
                          {endDate ? formatDate(endDate) : "設定しない"}
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
              {activeDateField && (
                <View style={styles.datePickerPanel}>
                  <DateTimePicker
                    value={activeDateField === "start" ? startDate ?? new Date() : endDate ?? new Date()}
                    mode="date"
                    is24Hour={true}
                    display={Platform.OS === "ios" ? "inline" : "calendar"}
                    onChange={onDateChange}
                    locale="ja-JP"
                    minimumDate={new Date(1900, 0, 1)}
                    maximumDate={new Date(2099, 11, 31)}
                    style={styles.datePicker}
                  />
                  {Platform.OS === "ios" && (
                    <TouchableOpacity
                      style={styles.datePickerCloseButton}
                      onPress={() => setActiveDateField(null)}
                    >
                      <Text style={styles.datePickerCloseButtonText}>閉じる</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
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
                  <Text style={styles.itemDate}>{new Date(item.date).toLocaleString()}</Text>
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