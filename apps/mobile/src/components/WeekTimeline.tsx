import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { SavedItem } from "@milkbox/shared";
import { colors } from "../styles/tokens";
import { buildDayRange, moveDayRange, createDateKey, formatMonthLabel, formatWeekRangeLabel } from "../utils/calendarDates";
import { resolveDisplayColor } from "../utils/scheduleGrouping";
import { getDayRangeSwipeOffset, getDayEvents, HOUR_HEIGHT, layoutDayEvents, MIN_EVENT_MINUTES } from "../utils/weekTimeline";
import { WEEKDAY_LABELS } from "../utils/weekdays";

type Props = {
  items: SavedItem[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  getWeekdayTint: (weekday: number) => string;
  // 表示日数(1/3/7)は「週間/カレンダー」表示モードの切り替えと同じ行に
  // 並べたいため(Figma上でも同じ行の横並びトグルになっている)、CalendarScreen側で
  // 状態を持ち、ここへは表示のためのpropsとして渡す。
  dayCount: 1 | 3 | 7;
};

const TIME_AXIS_WIDTH = 32;
const formatMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export function WeekTimeline({ items, selectedDate, onSelectDate, getWeekdayTint, dayCount }: Props) {
  const horizontalScrollRef = useRef<ScrollView>(null);
  const [now, setNow] = useState(() => new Date());
  const scrollRef = useRef<ScrollView>(null);
  const initialized = useRef(false);
  const { width } = useWindowDimensions();
  // 重なった予定も読める列幅を確保し、小さな画面では標準の横スクロールを使う。
  const gridWidth = dayCount === 7 ? Math.max(width - 32, 560) : width - 32;
  const dayWidth = (gridWidth - TIME_AXIS_WIDTH) / dayCount;
  // レンジの起点(表示中の最初の日)。selectedDateをそのままbuildDayRangeの起点に
  // 使うと、1日/3日表示中に表示範囲内の別の日(例: 3日表示の真ん中の日)をタップした
  // だけで、その日が新しい起点になりレンジ全体がずれてしまう。前後移動(animateRange)・
  // dayCount変更・表示範囲外への遷移(月表示からのジャンプ・今日へボタン等)の時だけ
  // レンジを動かし、レンジ内の日をタップしただけの時は選択状態(selectedDate)だけを
  // 変えてレンジ自体は据え置く。
  const rangeStartRef = useRef<Date>(selectedDate);
  const prevDayCountRef = useRef(dayCount);
  if (prevDayCountRef.current !== dayCount) {
    prevDayCountRef.current = dayCount;
    rangeStartRef.current = selectedDate;
  } else {
    const currentRange = buildDayRange(rangeStartRef.current, dayCount);
    const inRange = currentRange.some((day) => createDateKey(day) === createDateKey(selectedDate));
    if (!inRange) {
      rangeStartRef.current = selectedDate;
    }
  }
  const dateRange = useMemo(
    () => buildDayRange(rangeStartRef.current, dayCount),
    // rangeStartRef.currentの更新は上の同期チェックで完了しているため、
    // dayCount/selectedDateの変化をトリガーに再計算すれば十分。
    [dayCount, selectedDate],
  );
  const days = useMemo(() => dateRange.map((day) => {
    const events = getDayEvents(items, day);
    return { day, allDay: events.allDay, timed: layoutDayEvents(events.timed) };
  }), [items, dateRange]);
  const todayIndex = dateRange.findIndex((day) => createDateKey(day) === createDateKey(now));
  const currentTop = (now.getHours() * 60 + now.getMinutes()) / 60 * HOUR_HEIGHT;

  useFocusEffect(useCallback(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []));

  const translateX = useSharedValue(0);
  const transitionId = useRef(0);
  const transition = useRef<{ id: number; dateKey: string } | null>(null);
  const animatedContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const finishTransition = useCallback((id: number) => {
    if (transition.current?.id === id) transition.current = null;
  }, []);

  // 日数変更・画面サイズ変更・アンマウント時は遷移と遅延コールバックを破棄する。
  useEffect(() => {
    transition.current = null;
    cancelAnimation(translateX);
    translateX.value = 0;
    return () => {
      transition.current = null;
      cancelAnimation(translateX);
    };
  }, [dayCount, gridWidth, translateX]);

  // 新しい日付の描画がコミットされてからスライドインを開始する。
  useEffect(() => {
    const pending = transition.current;
    if (!pending || pending.dateKey !== createDateKey(selectedDate)) return;
    translateX.value = withTiming(0, { duration: 180 }, (finished) => {
      if (finished) runOnJS(finishTransition)(pending.id);
    });
  }, [selectedDate, translateX, finishTransition]);

  // 表示中のレンジの起点(rangeStartRef.current)を基準に移動する。selectedDateを
  // 基準にすると、レンジ内の別の日を選択した状態から前後移動した時に移動幅が
  // ずれてしまう。
  const moveRange = useCallback((offset: number) => {
    onSelectDate(moveDayRange(rangeStartRef.current, dayCount, offset));
  }, [dayCount, onSelectDate]);
  const commitRange = useCallback((offset: number, id: number) => {
    if (transition.current?.id !== id) return;
    translateX.value = offset * gridWidth;
    moveRange(offset);
  }, [gridWidth, moveRange, translateX]);
  const animateRange = useCallback((offset: number) => {
    if (transition.current) return;
    const id = ++transitionId.current;
    transition.current = { id, dateKey: createDateKey(moveDayRange(rangeStartRef.current, dayCount, offset)) };
    translateX.value = withTiming(-offset * gridWidth, { duration: 160 }, (finished) => {
      if (finished) runOnJS(commitRange)(offset, id);
    });
  }, [dayCount, gridWidth, translateX, commitRange]);
  const nativeScrollGesture = useMemo(() => Gesture.Native(), []);
  const rangeSwipe = useMemo(() => Gesture.Pan()
    .enabled(dayCount !== 7)
    .maxPointers(1)
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .simultaneousWithExternalGesture(nativeScrollGesture)
    .runOnJS(true)
    .onEnd((event, success) => {
      if (!success) return;
      const offset = getDayRangeSwipeOffset(dayCount, event.translationX, event.translationY, event.velocityX);
      if (offset) animateRange(offset);
    }), [dayCount, animateRange, nativeScrollGesture]);
  // 表示日数の切り替えボタン自体はCalendarScreen側にあるが、切り替わった時に
  // 前の表示位置のまま横スクロールが残らないようここでリセットする。
  useEffect(() => {
    horizontalScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [dayCount]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.weekButton} accessibilityRole="button" accessibilityLabel={dayCount === 7 ? "前週" : dayCount === 3 ? "前の3日" : "前日"} onPress={() => animateRange(-1)}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.monthLabel}>{formatMonthLabel(dateRange[0])}</Text>
          <Text style={styles.rangeLabel}>{formatWeekRangeLabel(dateRange[0], dateRange[dateRange.length - 1])}</Text>
        </View>
        <Pressable style={styles.weekButton} accessibilityRole="button" accessibilityLabel={dayCount === 7 ? "次週" : dayCount === 3 ? "次の3日" : "翌日"} onPress={() => animateRange(1)}>
          <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>
      <GestureDetector gesture={rangeSwipe}>
        <ScrollView ref={horizontalScrollRef} horizontal scrollEnabled={dayCount === 7} bounces={dayCount === 7} style={styles.card} contentContainerStyle={{ width: gridWidth }} showsHorizontalScrollIndicator>
          <Animated.View style={[{ width: gridWidth, flex: 1 }, animatedContentStyle]}>
            <View style={styles.weekdays}>
              <View style={{ width: TIME_AXIS_WIDTH }} />
              {dateRange.map((day) => {
                const selected = createDateKey(day) === createDateKey(selectedDate);
                return (
                  <Pressable key={createDateKey(day)} style={[styles.dayHeader, { width: dayWidth }]}
                    accessibilityRole="button" accessibilityLabel={createDateKey(day)}
                    accessibilityState={{ selected }} onPress={() => { if (!transition.current) onSelectDate(day); }}>
                    <Text style={[styles.weekday, { color: getWeekdayTint(day.getDay()) }]}>{WEEKDAY_LABELS[day.getDay()]}</Text>
                    <View style={[styles.dateCircle, selected && styles.selectedDate]}>
                      <Text style={[styles.dateText, { color: selected ? colors.onPrimary : getWeekdayTint(day.getDay()) }]}>{day.getDate()}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {days.some((day) => day.allDay.length > 0) ? (
              <ScrollView style={styles.allDayArea} nestedScrollEnabled>
                <View style={styles.allDayRow}>
                  <Text style={styles.allDayLabel}>終日</Text>
                  {days.map(({ day, allDay }) => (
                    <View key={createDateKey(day)} style={{ width: dayWidth, padding: 2 }}>
                      {allDay.map((item) => {
                        const color = resolveDisplayColor(item);
                        return <Text key={item.id} style={[styles.allDayEvent, { color, backgroundColor: `${color}22`, borderLeftColor: color }]}>{item.text}</Text>;
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : null}
            <GestureDetector gesture={nativeScrollGesture}>
              <ScrollView ref={scrollRef} style={styles.timelineScroll} nestedScrollEnabled
                onContentSizeChange={() => {
                  if (initialized.current) return;
                  initialized.current = true;
                  scrollRef.current?.scrollTo({ y: Math.max(0, currentTop - 80), animated: false });
                }}>
                <View style={{ height: 24 * HOUR_HEIGHT + 12, width: gridWidth }}>
                  {Array.from({ length: 25 }, (_, hour) => (
                    <View key={hour} pointerEvents="none" style={[styles.hourRow, { top: hour * HOUR_HEIGHT }]}>
                      <Text style={styles.hourLabel}>{hour}:00</Text>
                      <View style={styles.hourLine} />
                    </View>
                  ))}
                  {days.map(({ day, timed }, index) => (
                    <View key={createDateKey(day)} style={[styles.dayColumn, { left: TIME_AXIS_WIDTH + index * dayWidth, width: dayWidth }]}>
                      {timed.map((event) => {
                        const color = resolveDisplayColor(event.item);
                        const height = Math.min(1440 - event.startMinutes, Math.max(MIN_EVENT_MINUTES, event.endMinutes - event.startMinutes)) / 60 * HOUR_HEIGHT;
                        return (
                          <View key={event.item.id}
                            accessible accessibilityLabel={`${createDateKey(day)} ${event.item.text} ${formatMinutes(event.startMinutes)}`}
                            style={[styles.event, {
                              top: event.startMinutes / 60 * HOUR_HEIGHT,
                              height,
                              left: event.lane / event.laneCount * dayWidth,
                              width: dayWidth / event.laneCount - 2,
                              backgroundColor: `${color}22`, borderLeftColor: color,
                            }]}>
                            <Text numberOfLines={height >= 40 ? 2 : 1} style={[styles.eventTitle, { color }]}>{event.item.text}</Text>
                            <Text numberOfLines={1} style={[styles.eventTime, { color }]}>{formatMinutes(event.startMinutes)}</Text>
                          </View>
                        );
                      })}
                    </View>
                  ))}
                  {todayIndex >= 0 ? (
                    <View pointerEvents="none" testID="week-current-time" style={[styles.currentTime, { top: currentTop, left: TIME_AXIS_WIDTH + todayIndex * dayWidth, width: dayWidth }]}>
                      <View style={styles.currentDot} />
                    </View>
                  ) : null}
                </View>
              </ScrollView>
            </GestureDetector>
          </Animated.View>
        </ScrollView>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 },
  heading: { alignItems: "center" },
  monthLabel: { fontSize: 21, fontWeight: "700", color: colors.textPrimary },
  rangeLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 4 },
  weekButton: { width: 38, height: 34, borderRadius: 12, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  card: { flex: 1, backgroundColor: colors.background, borderRadius: 12 },
  weekdays: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E8EAF0", paddingVertical: 8 },
  dayHeader: { alignItems: "center", gap: 4 },
  weekday: { fontSize: 10, fontWeight: "700" },
  dateCircle: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  selectedDate: { backgroundColor: colors.primary },
  dateText: { fontSize: 12, fontWeight: "700" },
  allDayArea: { maxHeight: 96, flexGrow: 0, borderBottomWidth: 1, borderBottomColor: "#E8EAF0" },
  allDayRow: { flexDirection: "row" },
  allDayLabel: { width: TIME_AXIS_WIDTH, fontSize: 9, color: colors.textSecondary, paddingTop: 6 },
  allDayEvent: { fontSize: 10, fontWeight: "600", borderLeftWidth: 3, borderRadius: 5, marginBottom: 3, padding: 3 },
  timelineScroll: { flex: 1 },
  hourRow: { position: "absolute", left: 0, right: 0, flexDirection: "row", alignItems: "center" },
  hourLabel: { transform: [{ translateY: -4 }], width: TIME_AXIS_WIDTH, fontSize: 8, textAlign: "right", paddingRight: 4, color: colors.textSecondary },
  hourLine: { position: "absolute", top: 0, left: TIME_AXIS_WIDTH, right: 0, height: 1, backgroundColor: "#E8EAF0" },
  dayColumn: { position: "absolute", top: 0, height: 24 * HOUR_HEIGHT, borderLeftWidth: 0.5, borderLeftColor: "#E8EAF0" },
  event: { position: "absolute", borderLeftWidth: 3, borderRadius: 5, paddingHorizontal: 2, paddingVertical: 2, overflow: "hidden" },
  eventTitle: { fontSize: 10, fontWeight: "700", lineHeight: 12 },
  eventTime: { fontSize: 9, lineHeight: 11 },
  currentTime: { position: "absolute", height: 1.5, backgroundColor: colors.destructive },
  currentDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.destructive, marginTop: -2 },
});
