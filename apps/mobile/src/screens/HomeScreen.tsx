import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import * as SQLite from 'expo-sqlite';
import { SQLiteItemRepository } from "../repositories/sqlite/ItemRepository";
import { SavedItem } from "@milkbox/shared/repositories/types";

const HomeScreen = () => {
  const [text, setText] = useState("");
  const [items, setItems] = useState<SavedItem[]>([]);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [repository] = useState(() => new SQLiteItemRepository());
  useEffect(() => {
    initDatabase();
  }, []);

  const initDatabase = async () => {
    try{
      await repository.initialize();
      await loadItems();
    }catch(error){
      Alert.alert("Error", "Failed to initialize database");
    }
    
    // const database = await SQLite.openDatabaseAsync('milkbox.db');
    // setDb(database);
    
    // await database.execAsync(`
    //   CREATE TABLE IF NOT EXISTS items (
    //     id INTEGER PRIMARY KEY AUTOINCREMENT,
    //     text TEXT NOT NULL,
    //     date TEXT NOT NULL
    //   );
    // `);
  };

  const loadItems = async () => {
    try {
      const result = await await repository.findAll();
      setItems(result);
    } catch (error) {
      Alert.alert("Error", "Failed to load data");
    }
  };

  const handlePress = () => {
    Alert.alert("Button Pressed", "You clicked the button!");
  };

  const handleSubmit = async () => {
    if (!text.trim()) {
      Alert.alert("Error", "Please enter some text");
      return;
    }

    try {
      await repository.create(text);
      setText("");
      Alert.alert("Success", "Data saved!");
      await loadItems();
    } catch (error) {
      Alert.alert("Error", "Failed to save data");
    }
  };

  const deleteItem = async (id: number) => {
    try{
      await repository.delete(id);
      await loadItems();
    }catch(error){
      Alert.alert("Error", "Failed to delete data");
    }

    // if (!db) return;
    
    // try {
    //   await db.runAsync('DELETE FROM items WHERE id = ?', [id]);
    //   loadItems();
    // } catch (error) {
    //   Alert.alert("Error", "Failed to delete data");
    // }
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.content}>
        <Text style={styles.title}>Milkbox Mobile</Text>
        <Text style={styles.subtitle}>React Native App</Text>
        <Text style={styles.date}>Built: {formatDate(new Date())}</Text>
        <TouchableOpacity style={styles.button} onPress={handlePress}>
          <Text style={styles.buttonText}>Click Me</Text>
        </TouchableOpacity>
        
        <View style={styles.formContainer}>
          <TextInput
            style={styles.textarea}
            value={text}
            onChangeText={setText}
            placeholder="Enter text here"
            multiline
          />
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.buttonText}>Submit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>Saved Items ({items.length}):</Text>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id.toString()}
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
});

export default HomeScreen;