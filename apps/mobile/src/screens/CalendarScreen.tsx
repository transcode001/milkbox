import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DatabaseManager } from "../repositories/sqlite/DatabaseManager";
import { SavedItem } from "@milkbox/shared/repositories/types";

type CalendarCell = {
  key: string;
  day: number | null;
  dateKey?: string;
  inCurrentMonth: boolean;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(value: string): string {
  return value.includes("T") ? value.split("T")[0] : value;
}

function buildMonthLabel(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildCalendarCells(currentMonth: Date): CalendarCell[] {
  const year = currentMonth.getFullYear();
  const monthIndex = currentMonth.getMonth();
  const firstOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay();

  const cells: CalendarCell[] = [];

  for (let i = 0; i < startWeekday; i += 1) {
    cells.push({
      key: `empty-start-${i}`,
      day: null,
      inCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({
      key: dateKey,
      day,
      dateKey,
      inCurrentMonth: true,
    });
  }

  const trailing = (7 - (cells.length % 7)) % 7;
  for (let i = 0; i < trailing; i += 1) {
    cells.push({
      key: `empty-end-${i}`,
      day: null,
      inCurrentMonth: false,
    });
  }

  return cells;
}

const CalendarScreen = () => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [items, setItems] = useState<SavedItem[]>([]);
  const [dbManager] = useState(() => new DatabaseManager());

  useEffect(() => {
    const initialize = async () => {
      await dbManager.initialize();
      const result = await dbManager.itemRepository.findAllWithCategory();
      setItems(result);
    };

    initialize();
  }, [dbManager]);

  const monthLabel = useMemo(() => buildMonthLabel(currentMonth), [currentMonth]);

  const dateCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const key = toDateKey(item.startDate ?? item.date);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [items]);

  const selectedDateItems = useMemo(
    () => items.filter((item) => toDateKey(item.startDate ?? item.date) === selectedDate),
    [items, selectedDate],
  );

  const cells = useMemo(() => buildCalendarCells(currentMonth), [currentMonth]);

  const moveMonth = (delta: number) => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1),
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.monthButton}
          onPress={() => moveMonth(-1)}
        >
          <Text style={styles.monthButtonText}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity
          style={styles.monthButton}
          onPress={() => moveMonth(1)}
        >
          <Text style={styles.monthButtonText}>{">"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={styles.weekdayText}>
            {label}
          </Text>
        ))}
      </View>

      <FlatList
        data={cells}
        keyExtractor={(item) => item.key}
        numColumns={7}
        scrollEnabled={false}
        contentContainerStyle={styles.calendarGrid}
        renderItem={({ item }) => {
          if (!item.day || !item.dateKey) {
            return <View style={[styles.dayCell, styles.emptyCell]} />;
          }

          const isSelected = item.dateKey === selectedDate;
          const hasItems = (dateCountMap.get(item.dateKey) ?? 0) > 0;

          return (
            <TouchableOpacity
              style={[styles.dayCell, isSelected && styles.dayCellSelected]}
              onPress={() => setSelectedDate(item.dateKey as string)}
            >
              <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                {item.day}
              </Text>
              {hasItems && <View style={styles.dot} />}
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Tasks on {selectedDate}</Text>
        {selectedDateItems.length === 0 ? (
          <Text style={styles.emptyText}>No tasks</Text>
        ) : (
          selectedDateItems.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <Text style={styles.itemTitle}>{item.text}</Text>
              <Text style={styles.itemSubText}>{item.categoryName ?? "Uncategorized"}</Text>
            </View>
          ))
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  monthButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dbeafe",
  },
  monthButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1d4ed8",
  },
  monthLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    color: "#64748b",
    fontWeight: "600",
  },
  calendarGrid: {
    marginBottom: 14,
  },
  dayCell: {
    width: "14.2857%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    marginBottom: 6,
  },
  emptyCell: {
    backgroundColor: "transparent",
  },
  dayCellSelected: {
    backgroundColor: "#3b82f6",
  },
  dayText: {
    color: "#0f172a",
    fontWeight: "600",
  },
  dayTextSelected: {
    color: "#ffffff",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#0ea5e9",
    marginTop: 3,
  },
  listContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    color: "#0f172a",
  },
  emptyText: {
    color: "#64748b",
  },
  itemCard: {
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  itemTitle: {
    color: "#0f172a",
    fontWeight: "600",
    marginBottom: 2,
  },
  itemSubText: {
    color: "#64748b",
    fontSize: 12,
  },
});

export default CalendarScreen;
