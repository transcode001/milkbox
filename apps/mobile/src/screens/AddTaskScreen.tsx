import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, SectionList, Platform, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect } from "react";
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DatabaseManager } from "../repositories/sqlite/DatabaseManager";
import { Category } from "../repositories/sqlite/CategoryRepository";
import { SavedItem } from "@milkbox/shared/repositories/types";

interface Option {
  value: string;
  label: string;
}
interface CategorySection {
  title: string;
  data: SavedItem[];
}

const AddTaskScreen = () => {
  const [text, setText] = useState("");
  const [items, setItems] = useState<CategorySection[]>([]);
  const [dbManager] = useState(() => new DatabaseManager());
  const [selectedOption, setSelectedOption] = useState<string>("1");
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [datePickerVisible, setDatePickerVisible] = useState<boolean>(Platform.OS === 'ios');
  const [timePickerVisible, setTimePickerVisible] = useState<boolean>(Platform.OS === 'ios');
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };

  useEffect(() => {
    initDatabase();
  }, []);

  const initDatabase = async () => {
    try{
      await dbManager.initialize();
      // 開発モード時のみDBをクリア
      if (__DEV__) {
        const devInitKey = "devDbInitialized";
        const hasInitialized = await AsyncStorage.getItem(devInitKey);
        if (!hasInitialized) {
          await dbManager.clearAll();
          await AsyncStorage.setItem(devInitKey, "true");
        }
      }
      await loadCategories();
      await loadItems();
    }catch(error){
      Alert.alert("Error", error.message);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await dbManager.categoryRepository.findAll();
      setCategories(result);
      if (result.length > 0 && !selectedOption) {
        setSelectedOption(result[0].id.toString());
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load categories");
    }
  };

  const loadItems = async () => {
    try {
      const result = await dbManager.itemRepository.findAllWithCategory();
      
      // カテゴリ別にグループ化
      const grouped = result.reduce((acc, item) => {
        const categoryName = item.categoryName || 'Unknown';
        const existing = acc.find(section => section.title === categoryName);
        
        if (existing) {
          existing.data.push(item);
        } else {
          acc.push({ title: categoryName, data: [item] });
        }
        
        return acc;
      }, [] as CategorySection[]);
      
      setItems(grouped);
    } catch (error) {
      Alert.alert("Error", "Failed to load data");
    }
  };

  const onDateChange = (event: any, selectedDate: Date | undefined) => {
    const currentDate = selectedDate || startDate;
    setDatePickerVisible(Platform.OS === 'ios');
    setStartDate(currentDate);
  };
  
  const handleSubmit = async () => {
    if (!text.trim()) {
      Alert.alert("Error", "Please enter some text");
      return;
    }

    try {
      await dbManager.itemRepository.create({
        categoryId: Number(selectedOption),
        text,
        date: startDate.toISOString(),
        startDate: startDate.toISOString(),
      });
      setText("");
      Alert.alert("Success", "Data saved!");
      await loadItems();
    } catch (error) {
      Alert.alert("Error", "Failed to save data");
    }
  };

  const deleteItem = async (id: number) => {
    try{
      await dbManager.itemRepository.delete(id);
      await loadItems();
    }catch(error){
      Alert.alert("Error", "Failed to delete data");
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert("Error", "Please enter category name");
      return;
    }

    try {
      await dbManager.categoryRepository.create(newCategoryName);
      setNewCategoryName("");
      setShowAddCategoryModal(false);
      await loadCategories();
      Alert.alert("Success", "Category added!");
    } catch (error) {
      Alert.alert("Error", "Failed to add category");
    }
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerLabel}>カテゴリを選択:</Text>
            <TouchableOpacity 
              style={styles.addCategoryButton}
              onPress={() => setShowAddCategoryModal(true)}
            >
              <Text style={styles.addCategoryButtonText}>+ 追加</Text>
            </TouchableOpacity>
          </View>
          <Picker
            selectedValue={selectedOption}
            onValueChange={(itemValue) => setSelectedOption(itemValue)}
            style={styles.picker}
            itemStyle={ styles.pickerItem  }
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

        {/* カテゴリ追加モーダル */}
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
        
        <View style={styles.formContainer}>
          <TextInput
            style={styles.textarea}
            value={text}
            onChangeText={setText}
            placeholder="Enter text here"
            multiline
          />
        { datePickerVisible &&
          <DateTimePicker
            value={startDate}
            mode="date"
            is24Hour={true}
            display="default"
            onChange={onDateChange}
            locale="ja-JP"
            style={{marginBottom: 20}}
          />
        }
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.buttonText}>Submit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>
            Saved Items ({items.reduce((sum, section) => sum + section.data.length, 0)}):
          </Text>
          <SectionList
            sections={items}
            keyExtractor={(item) => item.id.toString()}
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
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    padding: 20,
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
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: "center",
  },
  pickerContainer: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  addCategoryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  addCategoryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  picker: {
    height: Platform.OS === 'ios' ? 150 : 50,
  },
    pickerItem: {
    height: 150, // iOSのみ
  },
  selectedText: {
    padding: 10,
    fontSize: 14,
    color: '#666',
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  formContainer: {
    marginTop: 20,
    width: '100%',
  },
  textarea: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
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
    flex: 1,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
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
    color: '#999',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#ccc',
  },
  modalButtonSubmit: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default AddTaskScreen;