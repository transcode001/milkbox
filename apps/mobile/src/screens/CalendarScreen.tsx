import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  DimensionValue,
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

const BAR_COLORS = [
  { bg: "#3B82F6", text: "#ffffff", light: "#DBEAFE", lightText: "#1D4ED8" },
  { bg: "#10B981", text: "#ffffff", light: "#D1FAE5", lightText: "#065F46" },
  { bg: "#8B5CF6", text: "#ffffff", light: "#EDE9FE", lightText: "#5B21B6" },
  { bg: "#F97316", text: "#ffffff", light: "#FFEDD5", lightText: "#C2410C" },
  { bg: "#F43F5E", text: "#ffffff", light: "#FFE4E6", lightText: "#9F1239" },
  { bg: "#06B6D4", text: "#ffffff", light: "#CFFAFE", lightText: "#0E7490" },
  { bg: "#F59E0B", text: "#ffffff", light: "#FEF3C7", lightText: "#B45309" },
] as const;

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
  if (parseWeekdays(item.weekdays).length > 0) {
    return "毎週";
  }

  const source = item.startDate ?? item.endDate ?? item.date;
  if (!source.includes("T")) {
    return "終日";
  }

  return new Date(source).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isMultiDayRange(item: SavedItem): boolean {
  if (!item.startDate || !item.endDate) return false;
  const s = parseItemDate(item.startDate);
  const e = parseItemDate(item.endDate);
  if (!s || !e) return false;
  return s.getTime() !== e.getTime();
}

function parseWeekdays(value?: string): number[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (weekday): weekday is number =>
        typeof weekday === "number" && Number.isInteger(weekday) && weekday >= 0 && weekday <= 6,
    );
  } catch {
    return [];
  }
}

function formatWeekdays(value?: string): string {
  const weekdays = parseWeekdays(value);
  return weekdays.map((weekday) => WEEKDAY_LABELS[weekday]).join("・");
}

function hashColorIdx(key: string | undefined): number {
  if (!key) return 0;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h) % BAR_COLORS.length;
}

interface RangeBarEntry {
  item: SavedItem;
  startCol: number;
  endCol: number;
  continuesLeft: boolean;
  continuesRight: boolean;
  lane: number;
  colorIdx: number;
}

function assignLanes(entries: Omit<RangeBarEntry, "lane">[]): RangeBarEntry[] {
  const laneEnds: number[] = [];
  return entries.map((entry) => {
    let lane = laneEnds.findIndex((end) => end < entry.startCol);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = entry.endCol;
    return { ...entry, lane };
  });
}

function getRangeBarsForWeek(
  rangeItems: SavedItem[],
  weekdayItems: SavedItem[],
  week: Date[],
  colorMap: Map<string | undefined, number>,
): RangeBarEntry[] {
  const weekStart = startOfDay(week[0]);
  const weekEnd = startOfDay(week[6]);
  const entries: Omit<RangeBarEntry, "lane">[] = [];

  for (const item of rangeItems) {
    if (!item.startDate || !item.endDate) continue;
    const itemStart = parseItemDate(item.startDate);
    const itemEnd = parseItemDate(item.endDate);
    if (!itemStart || !itemEnd) continue;
    if (itemEnd < weekStart || itemStart > weekEnd) continue;

    const cs = itemStart < weekStart ? weekStart : itemStart;
    const ce = itemEnd > weekEnd ? weekEnd : itemEnd;
    const startCol = week.findIndex((d) => createDateKey(d) === createDateKey(cs));
    const endCol = week.findIndex((d) => createDateKey(d) === createDateKey(ce));
    if (startCol === -1 || endCol === -1) continue;

    entries.push({
      item,
      startCol,
      endCol,
      continuesLeft: itemStart < weekStart,
      continuesRight: itemEnd > weekEnd,
      colorIdx: colorMap.get(item.categoryName) ?? hashColorIdx(item.categoryName),
    });
  }

  for (const item of weekdayItems) {
    const weekdaySet = new Set(parseWeekdays(item.weekdays));
    const selectedCols = week
      .map((date, index) => (weekdaySet.has(date.getDay()) ? index : null))
      .filter((index): index is number => index !== null);
    if (selectedCols.length === 0) continue;

    let startCol = selectedCols[0];
    let endCol = selectedCols[0];

    for (const currentCol of selectedCols.slice(1)) {
      if (currentCol === endCol + 1) {
        endCol = currentCol;
        continue;
      }

      entries.push({
        item,
        startCol,
        endCol,
        continuesLeft: false,
        continuesRight: false,
        colorIdx: colorMap.get(item.categoryName) ?? hashColorIdx(item.categoryName),
      });

      startCol = currentCol;
      endCol = currentCol;
    }

    if (startCol !== undefined && endCol !== undefined) {
      entries.push({
        item,
        startCol,
        endCol,
        continuesLeft: false,
        continuesRight: false,
        colorIdx: colorMap.get(item.categoryName) ?? hashColorIdx(item.categoryName),
      });
    }
  }

  entries.sort((a, b) => a.startCol - b.startCol || a.endCol - b.endCol);
  return assignLanes(entries);
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

  const { rangeItems, weekdayItems, weekdayBarItems, pointItemsByDate, categoryColorMap } = useMemo(() => {
    const range: SavedItem[] = [];
    const weekday: SavedItem[] = [];
    const weekdayBarMap = new Map<string, { item: SavedItem; weekdays: Set<number> }>();
    const point = new Map<string, SavedItem[]>();
    const colorMap = new Map<string | undefined, number>();
    let colorIdx = 0;

    for (const item of items) {
      if (item.categoryName && !colorMap.has(item.categoryName)) {
        colorMap.set(item.categoryName, colorIdx++ % BAR_COLORS.length);
      }

      const itemWeekdays = parseWeekdays(item.weekdays);
      if (item.categoryName && itemWeekdays.length > 0) {
        weekday.push(item);
        const existing = weekdayBarMap.get(item.categoryName);
        if (existing) {
          for (const weekdayValue of itemWeekdays) {
            existing.weekdays.add(weekdayValue);
          }
        } else {
          weekdayBarMap.set(item.categoryName, {
            item,
            weekdays: new Set(itemWeekdays),
          });
        }
        continue;
      }

      if (isMultiDayRange(item)) {
        range.push(item);
        continue;
      }

      if (!item.startDate && !item.endDate) continue;
      const key = item.startDate ? toDateKey(item.startDate) : toDateKey(item.endDate!);

      const list = point.get(key) ?? [];
      list.push(item);
      point.set(key, list);
    }

    return {
      rangeItems: range,
      weekdayItems: weekday,
      weekdayBarItems: Array.from(weekdayBarMap.values(), ({ item, weekdays }) => ({
        ...item,
        text: item.categoryName ?? item.text,
        weekdays: JSON.stringify([...weekdays].sort((left, right) => left - right)),
      })),
      pointItemsByDate: point,
      categoryColorMap: colorMap,
    };
  }, [items]);

  const monthGrid = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const todayKey = createDateKey(new Date());
  const selectedDateKey = createDateKey(selectedDate);
  const selectedItems = useMemo(() => {
    const result: SavedItem[] = [];
    const sel = startOfDay(selectedDate);

    for (const item of rangeItems) {
      const s = parseItemDate(item.startDate!);
      const e = parseItemDate(item.endDate!);
      if (s && e && sel >= s && sel <= e) result.push(item);
    }

    for (const item of weekdayItems) {
      if (parseWeekdays(item.weekdays).includes(sel.getDay())) {
        result.push(item);
      }
    }

    result.push(...(pointItemsByDate.get(selectedDateKey) ?? []));

    return result.sort((left, right) => {
      const leftTime = new Date(left.startDate ?? left.endDate ?? left.date).getTime();
      const rightTime = new Date(right.startDate ?? right.endDate ?? right.date).getTime();
      return leftTime - rightTime;
    });
  }, [rangeItems, weekdayItems, pointItemsByDate, selectedDate, selectedDateKey]);

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
            {monthGrid.map((week, weekIndex) => {
              const bars = getRangeBarsForWeek(rangeItems, weekdayBarItems, week, categoryColorMap);
              const laneCount = bars.length > 0 ? Math.max(...bars.map((b) => b.lane)) + 1 : 0;

              return (
                <View key={`week-${weekIndex}`} style={localStyles.weekBlock}>
                  <View style={styles.weekRow}>
                    {week.map((date) => {
                      const dateKey = createDateKey(date);
                      const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
                      const isSelected = dateKey === selectedDateKey;
                      const isToday = dateKey === todayKey;
                      const pointCount = (pointItemsByDate.get(dateKey) ?? []).length;

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
                            {pointCount > 0 ? (
                              <View style={[styles.eventDot, isSelected && styles.eventDotSelected]} />
                            ) : null}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>

                  {laneCount > 0 && (
                    <View style={[localStyles.barContainer, { height: laneCount * 22 + 4 }]}>
                      {bars.map((bar) => {
                        const span = bar.endCol - bar.startCol + 1;
                        const padL = bar.continuesLeft ? 0 : 2;
                        const padR = bar.continuesRight ? 0 : 2;
                        const leftPct = `${(bar.startCol / 7) * 100}%` as DimensionValue;
                        const widthPct = `${(span / 7) * 100}%` as DimensionValue;
                        const color = BAR_COLORS[bar.colorIdx];

                        return (
                          <View
                            key={`${bar.item.id}-${bar.lane}-${bar.startCol}`}
                            style={[
                              localStyles.ganttBar,
                              {
                                top: bar.lane * 22 + 2,
                                left: leftPct,
                                width: widthPct,
                                marginLeft: padL,
                                marginRight: padR,
                                backgroundColor: color.bg,
                                borderTopLeftRadius: bar.continuesLeft ? 0 : 4,
                                borderBottomLeftRadius: bar.continuesLeft ? 0 : 4,
                                borderTopRightRadius: bar.continuesRight ? 0 : 4,
                                borderBottomRightRadius: bar.continuesRight ? 0 : 4,
                              },
                            ]}
                          >
                            <Pressable
                              onPress={() => handleSelectDate(week[bar.startCol])}
                              style={localStyles.ganttBarButton}
                            >
                              {!bar.continuesLeft && (
                                <Text
                                  style={[localStyles.ganttBarText, { color: color.text }]}
                                  numberOfLines={1}
                                >
                                  {bar.item.categoryName ?? bar.item.text}
                                </Text>
                              )}
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
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
                <Text style={styles.emptyText}>AddTask で登録したタスクがここに表示されます。</Text>
              </View>
            ) : (
              selectedItems.map((item) => {
                const colorIdx = categoryColorMap.get(item.categoryName) ?? hashColorIdx(item.categoryName);
                const color = BAR_COLORS[colorIdx];
                const isRange = isMultiDayRange(item);

                return (
                  <View key={item.id} style={styles.scheduleCard}>
                    <View style={styles.scheduleRow}>
                      <Text style={styles.scheduleTime}>{formatScheduleTime(item)}</Text>
                      {item.categoryName ? (
                        <View style={[styles.categoryBadge, { backgroundColor: color.light }]}>
                          <Text style={[styles.categoryBadgeText, { color: color.lightText }]}>
                            {item.categoryName}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.scheduleText}>{item.text}</Text>
                    {isRange && item.startDate && item.endDate ? (
                      <Text style={localStyles.rangeDateText}>
                        {toDateKey(item.startDate)} 〜 {toDateKey(item.endDate)}
                      </Text>
                    ) : item.weekdays ? (
                      <Text style={localStyles.rangeDateText}>
                        毎週 {formatWeekdays(item.weekdays)}
                      </Text>
                    ) : null}
                  </View>
                );
              })
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
  weekBlock: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  barContainer: {
    position: "relative",
    overflow: "hidden",
  },
  ganttBar: {
    position: "absolute",
    height: 18,
    paddingHorizontal: 4,
    overflow: "hidden",
  },
  ganttBarButton: {
    flex: 1,
    justifyContent: "center",
  },
  ganttBarText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "600",
  },
  rangeDateText: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
  },
});

export default CalendarScreen;
