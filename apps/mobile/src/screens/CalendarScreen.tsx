import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { SavedItem } from "@milkbox/shared/repositories/types";
import { styles } from "../styles/screens/CalendarScreen.styles";
import { useDatabaseManager } from "../contexts/DatabaseContext";

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

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function parseItemDate(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return startOfDay(parsed);
}

function getItemDateKeys(item: SavedItem): string[] {
  const startDate = parseItemDate(item.startDate);
  const endDate = parseItemDate(item.endDate);

  if (startDate && endDate) {
    const rangeStart = startDate <= endDate ? startDate : endDate;
    const rangeEnd = startDate <= endDate ? endDate : startDate;
    const keys: string[] = [];

    let current = rangeStart;
    while (current.getTime() <= rangeEnd.getTime()) {
      keys.push(createDateKey(current));
      current = addDays(current, 1);
    }

    return keys;
  }

  const sourceDate = startDate ?? endDate ?? parseItemDate(item.date);
  return sourceDate ? [createDateKey(sourceDate)] : [];
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
  const source = item.startDate ?? item.endDate ?? item.date;
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
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const scheduleHeaderYRef = useRef(0);
  const dbManager = useDatabaseManager();

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const result = await dbManager.itemRepository.findAllWithCategory();
      setItems(result);
      setErrorMessage(null);
    } catch (error) {
      console.error("Failed to load calendar items", error);
      setErrorMessage("予定の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [dbManager]);

  useFocusEffect(
    useCallback(() => {
      void loadItems();
    }, [loadItems]),
  );

  const itemsByDate = useMemo(() => {
    const grouped = new Map<string, SavedItem[]>();

    for (const item of items) {
      if (!item.categoryName) {
        continue;
      }

      // 「期間指定なし」は日付表示の対象外にする
      const dateKeys = getItemDateKeys(item);

      if (dateKeys.length === 0) {
        continue;
      }

      for (const dateKey of dateKeys) {
        const current = grouped.get(dateKey) ?? [];
        current.push(item);
        grouped.set(dateKey, current);
      }
    }

    return grouped;
  }, [items]);

  const monthGrid = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const todayKey = createDateKey(new Date());
  const selectedDateKey = createDateKey(selectedDate);
  const selectedItems = useMemo(() => {
    const currentItems = itemsByDate.get(selectedDateKey) ?? [];
    return [...currentItems].sort((left, right) => {
      const leftTime = new Date(left.startDate ?? left.endDate ?? left.date).getTime();
      const rightTime = new Date(right.startDate ?? right.endDate ?? right.date).getTime();
      return leftTime - rightTime;
    });
  }, [itemsByDate, selectedDateKey]);

  const moveMonth = useCallback((diff: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + diff, 1));
  }, []);

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(startOfDay(date));
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ y: scheduleHeaderYRef.current, animated: true });
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={localStyles.stateContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : errorMessage ? (
        <View style={localStyles.stateContainer}>
          <Text style={localStyles.stateText}>{errorMessage}</Text>
        </View>
      ) : (
        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
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
                      onPress={() => handleSelectDate(date)}
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

          <View
            style={styles.scheduleHeader}
            onLayout={(event) => {
              scheduleHeaderYRef.current = event.nativeEvent.layout.y;
            }}
          >
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
                <Text style={styles.emptyText}>AddTask で登録したサブタスクがここに表示されます。</Text>
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
      )}
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
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

export default CalendarScreen;
