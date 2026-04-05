import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { DatabaseManager } from "../repositories/sqlite/DatabaseManager";
import { SavedItem } from "@milkbox/shared/repositories/types";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function createDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toDateKey(value: string): string {
  if (value.includes("T")) {
    return value.split("T")[0];
  }
  return value;
}

function getCalendarStart(date: Date): Date {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  return new Date(
    firstDayOfMonth.getFullYear(),
    firstDayOfMonth.getMonth(),
    firstDayOfMonth.getDate() - firstDayOfMonth.getDay(),
  );
}

function buildMonthGrid(date: Date): Date[][] {
  const startDate = getCalendarStart(date);
  return Array.from({ length: 6 }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const offset = weekIndex * 7 + dayIndex;
      return new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate() + offset,
      );
    }),
  );
}

function formatMonthLabel(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function formatScheduleTime(item: SavedItem): string {
  const source = item.startDate ?? item.date;
  if (!source.includes("T")) {
    return "終日";
  }

  return new Date(source).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CalendarScreen = () => {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [items, setItems] = useState<SavedItem[]>([]);
  const [dbManager] = useState(() => new DatabaseManager());

  const loadItems = useCallback(async () => {
    await dbManager.initialize();
    const result = await dbManager.itemRepository.findAllWithCategory();
    setItems(result);
  }, [dbManager]);

  useFocusEffect(
    useCallback(() => {
      void loadItems();
    }, [loadItems]),
  );

  const itemsByDate = useMemo(() => {
    const grouped = new Map<string, SavedItem[]>();

    for (const item of items) {
      const dateKey = toDateKey(item.startDate ?? item.date);
      const current = grouped.get(dateKey) ?? [];
      current.push(item);
      grouped.set(dateKey, current);
    }

    return grouped;
  }, [items]);

  const monthGrid = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const todayKey = createDateKey(new Date());
  const selectedDateKey = createDateKey(selectedDate);
  const selectedItems = useMemo(() => {
    const currentItems = itemsByDate.get(selectedDateKey) ?? [];
    return [...currentItems].sort((left, right) => {
      const leftTime = new Date(left.startDate ?? left.date).getTime();
      const rightTime = new Date(right.startDate ?? right.date).getTime();
      return leftTime - rightTime;
    });
  }, [itemsByDate, selectedDateKey]);

  const moveMonth = useCallback((diff: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + diff, 1));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Pressable style={styles.monthButton} onPress={() => moveMonth(-1)}>
            <Text style={styles.monthButtonText}>前月</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{formatMonthLabel(visibleMonth)}</Text>
          <Pressable style={styles.monthButton} onPress={() => moveMonth(1)}>
            <Text style={styles.monthButtonText}>次月</Text>
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAY_LABELS.map((label) => (
            <View key={label} style={styles.weekCell}>
              <Text style={styles.weekLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.calendarBody}>
          {monthGrid.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} style={styles.weekRow}>
              {week.map((date) => {
                const dateKey = createDateKey(date);
                const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
                const isSelected = dateKey === selectedDateKey;
                const isToday = dateKey === todayKey;
                const dayItems = itemsByDate.get(dateKey) ?? [];

                return (
                  <Pressable
                    key={dateKey}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      !isCurrentMonth && styles.dayCellMuted,
                    ]}
                    onPress={() => setSelectedDate(startOfDay(date))}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        !isCurrentMonth && styles.dayNumberMuted,
                        isSelected && styles.dayNumberSelected,
                        isToday && !isSelected && styles.dayNumberToday,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                    <View style={styles.dayMeta}>
                      {dayItems.length > 0 ? (
                        <>
                          <View style={[styles.eventDot, isSelected && styles.eventDotSelected]} />
                          <Text style={[styles.eventCount, isSelected && styles.eventCountSelected]}>
                            {dayItems.length}件
                          </Text>
                        </>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.scheduleHeader}>
          <Text style={styles.scheduleTitle}>{selectedDateKey} の予定</Text>
          <Pressable
            style={styles.todayButton}
            onPress={() => {
              const today = startOfDay(new Date());
              setVisibleMonth(today);
              setSelectedDate(today);
            }}
          >
            <Text style={styles.todayButtonText}>今日へ</Text>
          </Pressable>
        </View>

        <View style={styles.scheduleList}>
          {selectedItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>予定はありません</Text>
              <Text style={styles.emptyText}>AddTask で登録した予定がここに表示されます。</Text>
            </View>
          ) : (
            selectedItems.map((item) => (
              <View key={item.id} style={styles.scheduleCard}>
                <View style={styles.scheduleRow}>
                  <Text style={styles.scheduleTime}>{formatScheduleTime(item)}</Text>
                  {item.categoryName ? (
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{item.categoryName}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.scheduleText}>{item.text}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f8fc",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2937",
  },
  monthButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#ffffff",
    borderRadius: 10,
  },
  monthButtonText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
  },
  calendarBody: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  weekRow: {
    flexDirection: "row",
  },
  weekCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
  weekLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6b7280",
  },
  dayCell: {
    flex: 1,
    minHeight: 72,
    margin: 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
  },
  dayCellSelected: {
    backgroundColor: "#2563eb",
  },
  dayCellMuted: {
    opacity: 0.45,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  dayNumberMuted: {
    color: "#9ca3af",
  },
  dayNumberSelected: {
    color: "#ffffff",
  },
  dayNumberToday: {
    color: "#2563eb",
  },
  dayMeta: {
    marginTop: 8,
    alignItems: "flex-start",
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#2563eb",
    marginBottom: 4,
  },
  eventDotSelected: {
    backgroundColor: "#ffffff",
  },
  eventCount: {
    fontSize: 11,
    color: "#2563eb",
    fontWeight: "600",
  },
  eventCountSelected: {
    color: "#ffffff",
  },
  scheduleHeader: {
    marginTop: 20,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#e5edff",
  },
  todayButtonText: {
    color: "#1d4ed8",
    fontWeight: "600",
  },
  scheduleList: {
    paddingBottom: 8,
  },
  emptyState: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  scheduleCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  scheduleTime: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563eb",
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#eef2ff",
  },
  categoryBadgeText: {
    fontSize: 12,
    color: "#4338ca",
    fontWeight: "600",
  },
  scheduleText: {
    fontSize: 15,
    color: "#111827",
    lineHeight: 22,
  },
});

export default CalendarScreen;
