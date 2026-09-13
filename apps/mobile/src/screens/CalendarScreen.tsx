import { CompletionCheckbox, completionStyles } from "../components/CompletionCheckbox";
import { useItemCompletions } from "../hooks/useItemCompletions";
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
import type { SavedItem } from "@milkbox/shared";
import { styles } from "../styles/screens/CalendarScreen.styles";
import { useDatabaseManager } from "../contexts/DatabaseContext";
import { parseWeekdays } from "../utils/weekdays";
import { colors } from "../styles/tokens";
import {
  buildMonthGrid,
  createDateKey,
  parseItemDate,
  parsePointDate,
  startOfDay,
  toDateKey,
  formatMonthLabel,
} from "../utils/calendarDates";
import {
  UNCATEGORIZED_KEY,
  UNCATEGORIZED_LABEL,
  formatScheduleTime,
  groupScheduleItems,
  isMultiDayRange,
  resolveDisplayColor,
  sortScheduleItemsByTime,
} from "../utils/scheduleGrouping";
import { getRangeBarsForWeek } from "../utils/ganttBars";

const BAR_H = 22;
const BAR_PITCH = 26;

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

// 日曜/土曜/平日の色分けを、曜日ヘッダーと日付セルの2箇所で同じ配色を
// 使い回すための一元化(以前は同じ3色がベタ書きで重複していた)。
const WEEKDAY_TINT_SUNDAY = "#f87171";
const WEEKDAY_TINT_SATURDAY = "#60a5fa";
const WEEKDAY_TINT_WEEKDAY = "#6b7280";

function getWeekdayTint(dayOfWeek: number): string {
  if (dayOfWeek === 0) return WEEKDAY_TINT_SUNDAY;
  if (dayOfWeek === 6) return WEEKDAY_TINT_SATURDAY;
  return WEEKDAY_TINT_WEEKDAY;
}

const CalendarScreen = () => {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [scheduleDisplayMode, setScheduleDisplayMode] = useState<"category" | "time">("category");
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
  const completions = useItemCompletions(selectedDateKey);
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

    // 時刻順の並べ替えはgroupScheduleItems()が同じgetScheduleTimeValue()で
    // 必ず行うため、ここでは行わない(二重ソート・二重の日付パースを避ける)。
    return result;
  }, [rangeItems, weekdayItems, pointItemsByDate, selectedDate, selectedDateKey]);
  // 表示モードで使う方だけ計算する(どちらもO(n log n)のソートを含むため、
  // 非表示側まで毎回計算するのは無駄)。
  const selectedItemGroups = useMemo(
    () => (scheduleDisplayMode === "category" ? groupScheduleItems(selectedItems) : []),
    [scheduleDisplayMode, selectedItems],
  );
  const selectedItemsByTime = useMemo(
    () => (scheduleDisplayMode === "time" ? sortScheduleItemsByTime(selectedItems) : []),
    [scheduleDisplayMode, selectedItems],
  );

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
                <Text style={[styles.weekLabel, { color: getWeekdayTint(index) }]}>
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
                              !isSelected && !isToday
                                && (date.getDay() === 0 || date.getDay() === 6)
                                && { color: getWeekdayTint(date.getDay()) },
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

          <View style={styles.scheduleDisplayToggle} accessibilityRole="radiogroup">
            {(["category", "time"] as const).map((mode) => {
              const selected = scheduleDisplayMode === mode;
              return (
                <Pressable
                  key={mode}
                  style={[
                    styles.scheduleDisplayToggleButton,
                    selected && styles.scheduleDisplayToggleButtonSelected,
                  ]}
                  onPress={() => setScheduleDisplayMode(mode)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      styles.scheduleDisplayToggleText,
                      selected && styles.scheduleDisplayToggleTextSelected,
                    ]}
                  >
                    {mode === "category" ? "カテゴリ" : "時間順"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.scheduleList}>
            {selectedItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>予定はありません</Text>
                <Text style={styles.emptyText}>AddTask で登録したタスクがここに表示されます。</Text>
              </View>
            ) : scheduleDisplayMode === "category" ? (
              selectedItemGroups.flatMap((group) => {
                // 「カテゴリ指定なし」はitem.categoryColorを持たず各タスクが個別に
                // 色を選んでいるため、1枚のカードに束ねて代表色を使うと他のタスクの
                // 色が無視されてしまう。この場合だけグループ化前と同じ1タスク=1カード
                // (各カードが自分自身のcolorでアクセントバーを出す)に戻す。
                if (group.key === UNCATEGORIZED_KEY) {
                  return group.items.map((item) => {
                    const taskColor = resolveDisplayColor(item);
                    const isRange = isMultiDayRange(item);

                    return (
                      <View key={item.id} style={styles.scheduleCard}>
                        <View style={[styles.scheduleCardAccent, { backgroundColor: taskColor }]} />
                        <View style={styles.scheduleTaskRow}>
                          <CompletionCheckbox
                            text={item.text}
                            completed={completions.completedIds.has(item.id)}
                            disabled={completions.disabled}
                            onPress={() => void completions.toggleCompletion(item.id)}
                          />
                          <Text style={[styles.scheduleTime, { color: taskColor }]}>
                            {formatScheduleTime(item)}
                          </Text>
                          <Text style={[styles.scheduleText, completions.completedIds.has(item.id) && completionStyles.completedText]}>{item.text}</Text>
                        </View>
                        {isRange && item.startDate && item.endDate ? (
                          <Text style={localStyles.rangeDateText}>
                            {toDateKey(item.startDate)} 〜 {toDateKey(item.endDate)}
                          </Text>
                        ) : null}
                      </View>
                    );
                  });
                }

                // 実カテゴリのグループは全アイテムが同じcategoryColorを共有するため、
                // 先頭アイテムから読んでも代表色として問題ない。
                const groupColor = resolveDisplayColor(group.items[0]);

                return [
                  <View key={group.key} style={styles.scheduleCard}>
                    <View style={[styles.scheduleCardAccent, { backgroundColor: groupColor }]} />
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: `${groupColor}22` },
                      ]}
                    >
                      <Text style={[styles.categoryBadgeText, { color: groupColor }]}>
                        {group.categoryName}
                      </Text>
                    </View>
                    {group.items.map((item, index) => {
                      const taskColor = resolveDisplayColor(item);
                      const isRange = isMultiDayRange(item);

                      return (
                        <View
                          key={item.id}
                          style={[
                            styles.scheduleTask,
                            index > 0 && styles.scheduleTaskDivider,
                          ]}
                        >
                          <View style={styles.scheduleTaskRow}>
                            <CompletionCheckbox
                              text={item.text}
                              completed={completions.completedIds.has(item.id)}
                              disabled={completions.disabled}
                              onPress={() => void completions.toggleCompletion(item.id)}
                            />
                            <Text style={[styles.scheduleTime, { color: taskColor }]}>
                              {formatScheduleTime(item)}
                            </Text>
                            <Text style={[styles.scheduleText, completions.completedIds.has(item.id) && completionStyles.completedText]}>{item.text}</Text>
                          </View>
                          {isRange && item.startDate && item.endDate ? (
                            <Text style={localStyles.rangeDateText}>
                              {toDateKey(item.startDate)} 〜 {toDateKey(item.endDate)}
                            </Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>,
                ];
              })
            ) : (
              selectedItemsByTime.map((item) => {
                const taskColor = resolveDisplayColor(item);
                const isRange = isMultiDayRange(item);

                return (
                  <View key={item.id} style={styles.scheduleCard}>
                    <View style={[styles.scheduleCardAccent, { backgroundColor: taskColor }]} />
                    <View style={styles.scheduleTaskRow}>
                      <CompletionCheckbox
                        text={item.text}
                        completed={completions.completedIds.has(item.id)}
                        disabled={completions.disabled}
                        onPress={() => void completions.toggleCompletion(item.id)}
                      />
                      <View style={styles.chronologicalTaskContent}>
                        <Text style={[styles.scheduleTime, { color: taskColor }]}>
                          {formatScheduleTime(item)}
                        </Text>
                        <Text style={[styles.scheduleText, completions.completedIds.has(item.id) && completionStyles.completedText]}>{item.text}</Text>
                        {isRange && item.startDate && item.endDate ? (
                          <Text style={localStyles.rangeDateText}>
                            {toDateKey(item.startDate)} 〜 {toDateKey(item.endDate)}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.chronologicalCategoryColumn}>
                        <Text
                          style={[styles.chronologicalCategoryText, { color: taskColor }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.categoryName ?? UNCATEGORIZED_LABEL}
                        </Text>
                      </View>
                    </View>
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
