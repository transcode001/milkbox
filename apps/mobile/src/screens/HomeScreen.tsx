import { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SectionList, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { RootTabParamList } from "../navigation/types";
import { CategorySection, groupByCategory } from "../utils/groupByCategory";
import { useDatabaseManager } from "../contexts/DatabaseContext";
import { formatWeekdayLabels, parseWeekdays } from "../utils/weekdays";

type Props = BottomTabScreenProps<RootTabParamList, "Home">;

const formatCategoryWeekdays = (section: CategorySection): string | null => {
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
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { dbManager, notificationsEnabled } = useDatabaseManager();

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
      await dbManager.deleteItem(id);
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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>タスク</Text>
        <TouchableOpacity style={styles.addTaskButton} onPress={handleNavigateAddTask}>
          <Text style={styles.addTaskButtonText}>追加</Text>
        </TouchableOpacity>
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
            const weekdayLabels = formatCategoryWeekdays(section);

            return (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
                {weekdayLabels ? (
                  <Text style={styles.sectionWeekdays}>{weekdayLabels}</Text>
                ) : null}
              </View>
            );
          }}
          renderItem={({ item }) => {
            const dateTimeRange = formatItemDateTimeRange(item);

            return (
              <Swipeable renderRightActions={() => renderRightActions(item.id)}>
                <View style={styles.itemContainer}>
                  <View style={styles.itemMainRow}>
                    <Text style={styles.itemText}>{item.text}</Text>
                    {hasDateRange(item) && dateTimeRange ? (
                      <Text style={styles.itemDateSummary}>{dateTimeRange}</Text>
                    ) : null}
                  </View>
                </View>
              </Swipeable>
            );
          }}
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
  notificationWarning: {
    backgroundColor: "#FFF8D6",
    borderBottomWidth: 1,
    borderBottomColor: "#F0E2A0",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  notificationWarningText: {
    color: "#666",
    fontSize: 12,
    lineHeight: 18,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
  },
  sectionHeaderText: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  sectionWeekdays: {
    flexShrink: 0,
    color: "#666",
    fontSize: 12,
    fontWeight: "600",
  },
  itemContainer: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  itemMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemText: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  itemDateSummary: {
    flexShrink: 0,
    color: "#666",
    fontSize: 12,
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
