import { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SectionList, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { RootTabParamList } from "../navigation/types";
import { CategorySection, groupByCategory } from "../utils/groupByCategory";
import { useDatabaseManager } from "../contexts/DatabaseContext";

type Props = BottomTabScreenProps<RootTabParamList, "Home">;

const HomeScreen = ({ navigation }: Props) => {
  const [sections, setSections] = useState<CategorySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dbManager = useDatabaseManager();

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const result = await dbManager.itemRepository.findAllWithCategory();
      const grouped = groupByCategory(result);

      setSections(grouped);
    } catch (error) {
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
      await dbManager.itemRepository.delete(id);
      await loadItems();
    } catch (error) {
      Alert.alert("エラー", "タスクの削除に失敗しました");
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

  const formatItemDate = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
  };

  const hasDateRange = (item: { startDate?: string; endDate?: string }) =>
    Boolean(item.startDate || item.endDate);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>タスク</Text>
        <TouchableOpacity style={styles.addTaskButton} onPress={handleNavigateAddTask}>
          <Text style={styles.addTaskButtonText}>追加</Text>
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
          <Text style={styles.stateText}>タスクはまだありません</Text>
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
            <Swipeable renderRightActions={() => renderRightActions(item.id)}>
              <View style={styles.itemContainer}>
                <Text style={styles.itemText}>{item.text}</Text>
                {hasDateRange(item) ? (
                  <View style={styles.itemDateRow}>
                    {item.startDate ? (
                      <View style={styles.itemDateColumn}>
                        <Text style={styles.itemDateLabel}>開始日</Text>
                        <Text style={styles.itemDateValue}>{formatItemDate(item.startDate)}</Text>
                      </View>
                    ) : null}
                    {item.endDate ? (
                      <View style={styles.itemDateColumn}>
                        <Text style={styles.itemDateLabel}>終了日</Text>
                        <Text style={styles.itemDateValue}>{formatItemDate(item.endDate)}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </Swipeable>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  addTaskButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addTaskButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
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
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 4,
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
  deleteAction: {
    width: 84,
    height: "100%",
    backgroundColor: "#D11A2A",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    marginVertical: 4,
  },
  deleteActionText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
});

export default HomeScreen;
