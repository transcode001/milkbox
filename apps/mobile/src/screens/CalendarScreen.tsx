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
import { parseWeekdays } from "../utils/weekdays";
import { colors } from "../styles/tokens";

// 表示色はカテゴリの色(categoryColor)を優先し、カテゴリ未設定のタスクだけ
// タスク自身のcolor(AddTaskScreenのColorPickerで選択された値、常に非空)を使う。
// 以前はカテゴリ名のハッシュから固定パレット(BAR_PALETTE)を割り当てていたが、
// item.colorが常に埋まる仕様になったことで`??`によるフォールバックが機能しなくなり、
// カテゴリごとの色分けが事実上死んでいた。カテゴリ自体が色を持つようになった今は
// そのcategoryColorを直接使うのが正しい。
function resolveDisplayColor(item: SavedItem): string {
  return item.categoryColor ?? item.color;
}

const BAR_H = 22;
const BAR_PITCH = 26;

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function createDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toDateKey(value: string): string {
  if (value.includes("T") || value.includes(" ")) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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

export function formatTimeOfDay(value?: string): string | null {
  if (!value || !value.includes("T")) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatScheduleTime(item: SavedItem): string {
  const start = formatTimeOfDay(item.startDate);
  const end = formatTimeOfDay(item.endDate);
  if (start && end) return `${start} 〜 ${end}`;
  if (start) return start;
  if (end) return `〜 ${end}`;
  // 曜日繰り返しタスクの date は作成時刻が入るため時間表示には使わない
  if (parseWeekdays(item.weekdays).length > 0) return "終日";
  return formatTimeOfDay(item.date) ?? "終日";
}

function isMultiDayRange(item: SavedItem): boolean {
  if (!item.startDate || !item.endDate) return false;
  const s = parseItemDate(item.startDate);
  const e = parseItemDate(item.endDate);
  if (!s || !e) return false;
  return s.getTime() !== e.getTime();
}

function parsePointDate(value?: string): Date | null {
  if (!value) return null;

  if (!value.includes("T") && !value.includes(" ")) {
    const parts = value.split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2], 9, 0, 0, 0);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

interface RangeBarEntry {
  item: SavedItem;
  startCol: number;
  endCol: number;
  continuesLeft: boolean;
  continuesRight: boolean;
  isWeekday: boolean;
  lane: number;
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
      isWeekday: false,
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
        isWeekday: true,
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
        isWeekday: true,
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
  const { dbManager } = useDatabaseManager();

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

  const { rangeItems, weekdayItems, weekdayBarItems, pointItemsByDate } = useMemo(() => {
    const range: SavedItem[] = [];
    const weekday: SavedItem[] = [];
    const weekdayBarMap = new Map<string, { item: SavedItem; weekdays: Set<number> }>();
    const point = new Map<string, SavedItem[]>();

    for (const item of items) {
      const itemWeekdays = parseWeekdays(item.weekdays);
      if (itemWeekdays.length > 0) {
        weekday.push(item);
        if (item.categoryName) {
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
        }
        continue;
      }

      if (isMultiDayRange(item)) {
        range.push(item);
        continue;
      }

      const pointDate = parsePointDate(item.startDate ?? item.endDate ?? item.date);
      if (!pointDate) continue;
      const key = createDateKey(pointDate);

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
      const leftTime = parsePointDate(left.startDate ?? left.endDate ?? left.date)?.getTime() ?? 0;
      const rightTime = parsePointDate(right.startDate ?? right.endDate ?? right.date)?.getTime() ?? 0;
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
            {WEEKDAY_LABELS.map((label, index) => (
              <View key={label} style={styles.weekCell}>
                <Text
                  style={[
                    styles.weekLabel,
                    index === 0 && { color: "#f87171" },
                    index === 6 && { color: "#60a5fa" },
                    index > 0 && index < 6 && { color: "#6b7280" },
                  ]}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.calendarBody}>
            {monthGrid.map((week, weekIndex) => {
              const bars = getRangeBarsForWeek(rangeItems, weekdayBarItems, week);
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
                              !isSelected && !isToday && date.getDay() === 0 && { color: "#f87171" },
                              !isSelected && !isToday && date.getDay() === 6 && { color: "#60a5fa" },
                            ]}
                          >
                            {date.getDate()}
                          </Text>
                          {pointCount > 0 && (
                            <View style={styles.eventDotRow}>
                              {Array.from({ length: Math.min(pointCount, 3) }).map((_, index) => (
                                <View key={index} style={styles.eventDot} />
                              ))}
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>

                  {laneCount > 0 && (
                    <View style={[localStyles.barContainer, { height: laneCount * BAR_PITCH + 4 }]}>
                      {bars.map((bar) => {
                        const taskColor = resolveDisplayColor(bar.item);
                        const span = bar.endCol - bar.startCol + 1;
                        const padL = bar.continuesLeft ? 0 : 3;
                        const padR = bar.continuesRight ? 0 : 3;
                        const rL = bar.continuesLeft ? 0 : 6;
                        const rR = bar.continuesRight ? 0 : 6;
                        const leftPct = `${(bar.startCol / 7) * 100}%` as DimensionValue;
                        const widthPct = `${(span / 7) * 100}%` as DimensionValue;

                        return (
                          <Pressable
                            key={`${bar.item.id}-${bar.lane}-${bar.startCol}`}
                            onPress={() => handleSelectDate(week[bar.startCol])}
                            style={[
                              localStyles.ganttBar,
                              {
                                top: bar.lane * BAR_PITCH + 2,
                                left: leftPct,
                                width: widthPct,
                                height: BAR_H,
                                marginLeft: padL,
                                marginRight: padR,
                                backgroundColor: bar.isWeekday ? `${taskColor}22` : taskColor,
                                borderWidth: bar.isWeekday ? 1.5 : 0,
                                borderColor: bar.isWeekday ? taskColor : "transparent",
                                borderStyle: bar.isWeekday ? "dashed" : "solid",
                                borderTopLeftRadius: rL,
                                borderBottomLeftRadius: rL,
                                borderTopRightRadius: rR,
                                borderBottomRightRadius: rR,
                              },
                            ]}
                          >
                            {!bar.continuesLeft && (
                              <View style={localStyles.ganttBarInner}>
                                <View
                                  style={[
                                    localStyles.ganttBarDot,
                                    {
                                      backgroundColor: bar.isWeekday
                                        ? taskColor
                                        : "rgba(255,255,255,0.7)",
                                    },
                                  ]}
                                />
                                <Text
                                  style={[
                                    localStyles.ganttBarText,
                                    { color: bar.isWeekday ? taskColor : "#ffffff" },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {bar.item.categoryName ?? bar.item.text}
                                </Text>
                              </View>
                            )}
                          </Pressable>
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
                const taskColor = resolveDisplayColor(item);
                const isRange = isMultiDayRange(item);

                return (
                  <View key={item.id} style={styles.scheduleCard}>
                    <View style={[styles.scheduleCardAccent, { backgroundColor: taskColor }]} />
                    <View style={styles.scheduleRow}>
                      <Text style={[styles.scheduleTime, { color: taskColor }]}>
                        {formatScheduleTime(item)}
                      </Text>
                      {item.categoryName ? (
                        <View
                          style={[
                            styles.categoryBadge,
                            { backgroundColor: `${taskColor}22` },
                          ]}
                        >
                          <Text style={[styles.categoryBadgeText, { color: taskColor }]}>
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
    overflow: "hidden",
    justifyContent: "center",
  },
  ganttBarInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  ganttBarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
    flexShrink: 0,
  },
  ganttBarText: {
    fontSize: 11,
    fontWeight: "600",
    flexShrink: 1,
  },
  rangeDateText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
});

export default CalendarScreen;
