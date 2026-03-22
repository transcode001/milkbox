import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DatabaseManager } from "../repositories/sqlite/DatabaseManager";
import { SavedItem } from "@milkbox/shared/repositories/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function toDateKey(value: string): string {
  return value.includes("T") ? value.split("T")[0] : value;
}

function dateToKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const CalendarScreen = () => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [items, setItems] = useState<SavedItem[]>([]);
  const [dbManager] = useState(() => new DatabaseManager());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    const initialize = async () => {
      await dbManager.initialize();
      const result = await dbManager.itemRepository.findAllWithCategory();
      setItems(result);
    };
    initialize();
  }, [dbManager]);

  // Group items by date
  const itemsByDate = useMemo(() => {
    const map = new Map<string, SavedItem[]>();
    for (const item of items) {
      const key = toDateKey(item.startDate ?? item.date);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    }
    return map;
  }, [items]);

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }, [year, month]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(dateToKey(new Date()));
  };

  const handleDayPress = (day: number) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateKey);
  };

  const todayKey = dateToKey(new Date());

  // Get items for selected date
  const selectedDateItems = selectedDate ? itemsByDate.get(selectedDate) ?? [] : [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>{"<"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToToday}>
          <Text style={styles.headerTitle}>
            {MONTHS[month]} {year}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>{">"}</Text>
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((day, index) => (
          <View key={day} style={styles.weekdayCell}>
            <Text
              style={[
                styles.weekdayText,
                index === 0 && styles.sundayText,
                index === 6 && styles.saturdayText,
              ]}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = dateKey === todayKey;
          const isSelected = dateKey === selectedDate;
          const dayItems = itemsByDate.get(dateKey) ?? [];
          const hasItems = dayItems.length > 0;
          const dayOfWeek = (getFirstDayOfMonth(year, month) + day - 1) % 7;
          const isSunday = dayOfWeek === 0;
          const isSaturday = dayOfWeek === 6;

          return (
            <TouchableOpacity
              key={dateKey}
              style={[
                styles.dayCell,
                isToday && styles.todayCell,
                isSelected && styles.selectedCell,
              ]}
              onPress={() => handleDayPress(day)}
            >
              <Text
                style={[
                  styles.dayText,
                  isToday && styles.todayText,
                  isSelected && styles.selectedText,
                  isSunday && !isToday && !isSelected && styles.sundayText,
                  isSaturday && !isToday && !isSelected && styles.saturdayText,
                ]}
              >
                {day}
              </Text>
              {hasItems && (
                <View style={styles.dotContainer}>
                  {dayItems.slice(0, 3).map((item, i) => (
                    <View
                      key={item.id}
                      style={[
                        styles.dot,
                        { backgroundColor: getItemColor(item.categoryName) },
                      ]}
                    />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected date items */}
      {selectedDate && (
        <View style={styles.itemsContainer}>
          <Text style={styles.itemsTitle}>
            {selectedDate.replace(/-/g, "/")}
          </Text>
          {selectedDateItems.length === 0 ? (
            <Text style={styles.noItemsText}>No items for this day</Text>
          ) : (
            <ScrollView style={styles.itemsList}>
              {selectedDateItems.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.itemRow,
                    { borderLeftColor: getItemColor(item.categoryName) },
                  ]}
                >
                  <Text style={styles.itemText}>{item.text}</Text>
                  {item.categoryName && (
                    <Text style={styles.itemCategory}>{item.categoryName}</Text>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

function getItemColor(category: string | null | undefined): string {
  const colors: Record<string, string> = {
    Work: "#3b82f6",
    Personal: "#10b981",
    Shopping: "#f59e0b",
    Health: "#ef4444",
  };
  return colors[category ?? ""] ?? "#6b7280";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    fontSize: 20,
    color: "#3b82f6",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  weekdayRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
  },
  weekdayText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  sundayText: {
    color: "#ef4444",
  },
  saturdayText: {
    color: "#3b82f6",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  todayCell: {
    backgroundColor: "#3b82f6",
    borderRadius: 999,
  },
  selectedCell: {
    backgroundColor: "#dbeafe",
    borderRadius: 999,
  },
  dayText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1f2937",
  },
  todayText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  selectedText: {
    color: "#1e40af",
    fontWeight: "700",
  },
  dotContainer: {
    flexDirection: "row",
    marginTop: 2,
    gap: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  itemsContainer: {
    flex: 1,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 12,
  },
  noItemsText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 20,
  },
  itemsList: {
    flex: 1,
  },
  itemRow: {
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
  },
  itemCategory: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
});

export default CalendarScreen;
