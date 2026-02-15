import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SectionList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { DatabaseManager } from "../repositories/sqlite/DatabaseManager";
import { SavedItem } from "@milkbox/shared/repositories/types";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface CategorySection {
  title: string;
  data: SavedItem[];
}

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

const HomeScreen = ({ navigation }: Props) => {
  const [sections, setSections] = useState<CategorySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dbManager] = useState(() => new DatabaseManager());
  const devDbClearKey = "dev_db_cleared_v1";

  useEffect(() => {
    loadItems();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  const loadItems = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      await dbManager.initialize();
      if (__DEV__) {
        const cleared = await AsyncStorage.getItem(devDbClearKey);
        if (!cleared) {
          await dbManager.clearAll();
          await AsyncStorage.setItem(devDbClearKey, "1");
        }
      }
      const result = await dbManager.itemRepository.findAllWithCategory();
      const grouped = result.reduce((acc, item) => {
        const categoryName = item.categoryName || "Unknown";
        const existing = acc.find((section) => section.title === categoryName);

        if (existing) {
          existing.data.push(item);
        } else {
          acc.push({ title: categoryName, data: [item] });
        }

        return acc;
      }, [] as CategorySection[]);

      setSections(grouped);
    } catch (error) {
      setErrorMessage("Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateAddTask = () => {
    navigation.navigate("AddTask");
  };

  const formatItemDate = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Items by Category</Text>
        <TouchableOpacity style={styles.button} onPress={handleNavigateAddTask}>
          <Text style={styles.buttonText}>Add Task</Text>
        </TouchableOpacity>
      </View>

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
          <Text style={styles.stateText}>No items yet</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.itemContainer}>
              <Text style={styles.itemText}>{item.text}</Text>
              <View style={styles.itemDateRow}>
                <View style={styles.itemDateColumn}>
                  <Text style={styles.itemDateLabel}>開始日</Text>
                  <Text style={styles.itemDateValue}>{formatItemDate(item.startDate)}</Text>
                </View>
                <View style={styles.itemDateColumn}>
                  <Text style={styles.itemDateLabel}>終了日</Text>
                  <Text style={styles.itemDateValue}>{formatItemDate(item.endDate)}</Text>
                </View>
              </View>
            </View>
          )}
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
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#111",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeader: {
    paddingVertical: 8,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: "700",
  },
  itemContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  itemText: {
    fontSize: 15,
    fontWeight: "500",
  },
  itemDateRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  itemDateColumn: {
    flex: 1,
  },
  itemDateLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#444",
    marginBottom: 2,
  },
  itemDateValue: {
    fontSize: 12,
    color: "#666",
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
});

export default HomeScreen;
