import { getGanttBarAppearance } from "../utils/ganttBars";
import { CompletionStatsCard, CompletionStatusPill } from "../components/CompletionStatsCard";
import { countCategoryOccurrences } from "../utils/completionStats";
import { WeekTimeline } from "../components/WeekTimeline";
import { TaskDetailBottomSheet } from "../components/TaskDetailBottomSheet";
import { EditItemModal } from "../components/EditItemModal";
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
import type { Category, SavedItem } from "@milkbox/shared";
import { styles } from "../styles/screens/CalendarScreen.styles";
import { useDatabaseManager } from "../contexts/DatabaseContext";
import { parseWeekdays } from "../utils/weekdays";
import { occursOnDate } from "../utils/recurrence";
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
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [dayCount, setDayCount] = useState<1 | 3 | 7>(7);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [scheduleDisplayMode, setScheduleDisplayMode] = useState<"category" | "time">("category");
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detailTarget, setDetailTarget] = useState<{ itemId: number; date: Date } | null>(null);
  const [editingItem, setEditingItem] = useState<SavedItem | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const scheduleHeaderYRef = useRef(0);
  const { dbManager } = useDatabaseManager();

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const [result, categoryResult] = await Promise.all([dbManager.itemRepository.findAllWithCategory(), dbManager.categoryRepository.findAll()]);
      setCategories(categoryResult);
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

  const { rangeItems, weekdayItems, weekdayBarItems, recurringItems, pointItemsByDate } = useMemo(() => {
    const range: SavedItem[] = [];
    const weekday: SavedItem[] = [];
    const weekdayBarMap = new Map<string, { item: SavedItem; weekdays: Set<number> }>();
    const recurring: SavedItem[] = [];
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

      // 隔週/毎月/N日ごとはweekdaysともstartDate〜endDateの範囲指定とも別物なので、
      // isMultiDayRange()やポイント日付の判定より先に分岐させる。
      if (item.recurrence) {
        recurring.push(item);
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
      recurringItems: recurring,
      pointItemsByDate: point,
    };
  }, [items]);

  // week表示中はmonthGridを使わないため、月をまたぐ週送り(visibleMonthの更新)の
  // たびに無駄な6x7の日付行列を組み立てないよう、必要な時だけ計算する。
  const monthGrid = useMemo(
    () => (viewMode === "month" ? buildMonthGrid(visibleMonth) : []),
    [visibleMonth, viewMode],
  );
  // 隔週/毎月/N日ごとはpointItemsByDate(特定の1日に紐づく予定)に入らないため、
  // 月表示のグリッドに限って各セルごとに発生判定して予定マーク(ドット)の
  // 集計に含める。月表示以外(週表示)ではmonthGridが空になり計算されない。
  const recurringItemsByDate = useMemo(() => {
    const map = new Map<string, SavedItem[]>();
    if (recurringItems.length === 0) return map;

    for (const week of monthGrid) {
      for (const date of week) {
        const matches = recurringItems.filter((item) => occursOnDate(item, date));
        if (matches.length > 0) map.set(createDateKey(date), matches);
      }
    }
    return map;
  }, [monthGrid, recurringItems]);
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

    for (const item of recurringItems) {
      if (occursOnDate(item, sel)) result.push(item);
    }

    result.push(...(pointItemsByDate.get(selectedDateKey) ?? []));

    // 時刻順の並べ替えはgroupScheduleItems()が同じgetScheduleTimeValue()で
    // 必ず行うため、ここでは行わない(二重ソート・二重の日付パースを避ける)。
    return result;
  }, [rangeItems, weekdayItems, recurringItems, pointItemsByDate, selectedDate, selectedDateKey]);
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

  const dayGroups = useMemo(() => countCategoryOccurrences(selectedItems, categories), [selectedItems, categories]);
  const dayCompleted = useMemo(() => selectedItems.filter(item => completions.completedIds.has(item.id)).length,
    [selectedItems, completions.completedIds]);

  const moveMonth = useCallback((diff: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + diff, 1));
  }, []);

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(startOfDay(date));
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ y: scheduleHeaderYRef.current, animated: true });
    });
  }, []);

  // detailTarget自体にはitemのスナップショットを持たせず、常にitems(最新の
  // 読み込み結果)からidで引き直す。スナップショットを持たせると、シートを
  // 開いたまま通知トグルなどでitemsを再読み込みした時にシート側の表示が
  // 古いまま固定されてしまう(トグルを連打しても同じ状態に戻るだけになる、
  // 編集モーダルへ引き継ぐ値が古くなる、といった不具合の原因になる)。
  const detailItem = detailTarget
    ? items.find((candidate) => candidate.id === detailTarget.itemId) ?? null
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <TaskDetailBottomSheet
        item={detailItem}
        occurrenceDate={detailTarget?.date ?? null}
        onClose={() => setDetailTarget(null)}
        onEdit={(item) => setEditingItem(item)}
        onChanged={loadItems}
      />
      <EditItemModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSaved={loadItems}
      />
      <View style={localStyles.topToggleRow}>
        {viewMode === "week" ? (
          <View style={[styles.scheduleDisplayToggle, localStyles.topToggleHalf]} accessibilityRole="radiogroup">
            {([1, 3, 7] as const).map((count) => (
              <Pressable key={count}
                style={[styles.scheduleDisplayToggleButton, localStyles.topToggleButton, dayCount === count && styles.scheduleDisplayToggleButtonSelected]}
                accessibilityRole="radio"
                accessibilityLabel={count === 7 ? "週間表示" : `${count}日表示`}
                accessibilityState={{ selected: dayCount === count }}
                onPress={() => setDayCount(count)}>
                <Text style={[styles.scheduleDisplayToggleText, dayCount === count && styles.scheduleDisplayToggleTextSelected]}>
                  {count === 7 ? "週間" : `${count}日`}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          // 月表示中は日数切り替えが意味を持たないため空欄にするが、モード切り替え側の
          // 位置がズレないよう幅だけは同じ比率で確保する(Figma上も月表示時は空欄)。
          <View style={localStyles.topToggleHalf} />
        )}
        <View style={[styles.scheduleDisplayToggle, localStyles.topToggleHalf]} accessibilityRole="radiogroup">
          {(["week", "month"] as const).map((mode) => (
            <Pressable key={mode}
              style={[styles.scheduleDisplayToggleButton, localStyles.topToggleButton, viewMode === mode && styles.scheduleDisplayToggleButtonSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected: viewMode === mode }}
              onPress={() => setViewMode(mode)}>
              <Text style={[styles.scheduleDisplayToggleText, viewMode === mode && styles.scheduleDisplayToggleTextSelected]}>
                {mode === "week" ? "週間" : "カレンダー"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {loading ? (
        <View style={localStyles.stateContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : errorMessage ? (
        <View style={localStyles.stateContainer}>
          <Text style={localStyles.stateText}>{errorMessage}</Text>
        </View>
      ) : viewMode === "week" ? (
        <WeekTimeline items={items} selectedDate={selectedDate} dayCount={dayCount}
          onSelectDate={(date) => {
            setSelectedDate(startOfDay(date));
            setVisibleMonth(startOfDay(date));
          }}
          getWeekdayTint={getWeekdayTint}
          onSelectItem={(item, date) => setDetailTarget({ itemId: item.id, date })}
        />
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
                      const pointCount = (pointItemsByDate.get(dateKey) ?? []).length
                        + (recurringItemsByDate.get(dateKey) ?? []).length;

                      return (
                        <Pressable
                          key={dateKey}
                          style={[
                            styles.dayCell,
                            !isCurrentMonth && styles.dayCellMuted,
                          ]}
                          onPress={() => handleSelectDate(date)}
                          accessibilityLabel={`${dateKey} 予定${pointCount}件`}
                        >
                          <Text
                            style={[
                              styles.dayNumber,
                              // 当月外の土日はdayNumberMuted(textSecondary)を優先させたいが、
                              // 配列の後勝ちで週末の色付けが上書きしてしまわないよう、
                              // isCurrentMonthの時だけ週末色を適用する。
                              isCurrentMonth && !isSelected && !isToday
                                && (date.getDay() === 0 || date.getDay() === 6)
                                && { color: getWeekdayTint(date.getDay()) },
                              !isCurrentMonth && styles.dayNumberMuted,
                              isSelected && styles.dayNumberSelected,
                              isToday && !isSelected && styles.dayNumberToday,
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
                                ...getGanttBarAppearance(taskColor, bar.isWeekday),
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

          <CompletionStatsCard title="今日の進捗" completed={completions.disabled ? null : dayCompleted} total={selectedItems.length} groups={dayGroups} />
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
                          <CompletionStatusPill completed={completions.completedIds.has(item.id)} />
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
                            <CompletionStatusPill completed={completions.completedIds.has(item.id)} />
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
                        <CompletionStatusPill completed={completions.completedIds.has(item.id)} />
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
  // Figma上、日数切り替え(1日/3日/週間)と表示モード切り替え(週間/カレンダー)は
  // 同じ行に横並び(各半分幅)になっている。以前は別々の行だった。
  topToggleRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  topToggleHalf: {
    flex: 1,
    minWidth: 0,
  },
  // 共通ボタンの最小幅を解除し、各グループ内の幅に収める。
  topToggleButton: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 4,
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
