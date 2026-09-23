import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { PRIORITY_OPTIONS, type Category, type SavedItem } from "@milkbox/shared";
import { styles } from "../styles/screens/StatsScreen.styles";
import { colors } from "../styles/tokens";
import { useDatabaseManager } from "../contexts/DatabaseContext";
import {
  buildMonthDates,
  buildWeek,
  buildYearDates,
  createDateKey,
  formatDayLabel,
  formatMonthNumberLabel,
  formatWeekRangeLabel,
  formatYearLabel,
  moveDayRange,
  moveMonths,
  moveYears,
  startOfDay,
} from "../utils/calendarDates";
import {
  computeStatsSummary,
  groupDailyStatsByMonth,
  groupDailyStatsByWeekOfMonth,
  toWeekChartBars,
} from "../utils/completionStats";
import { UNCATEGORIZED_LABEL } from "../utils/scheduleGrouping";
import { CategorySignatureIcon } from "../components/CategorySignature";
import { StatsProgressRow } from "../components/StatsProgressRow";
import { PeriodCompletionChart } from "../components/PeriodCompletionChart";
import { PRIORITY_COLORS } from "../constants/colors";

type StatsPeriod = "day" | "week" | "month" | "year";

const PERIOD_OPTIONS: { value: StatsPeriod; label: string }[] = [
  { value: "day", label: "日" },
  { value: "week", label: "週" },
  { value: "month", label: "月" },
  { value: "year", label: "年" },
];

const CARD_TITLES: Record<StatsPeriod, string> = {
  day: "今日の達成率",
  week: "週の達成率",
  month: "月の達成率",
  year: "年の達成率",
};

const EMPTY_MESSAGES: Record<StatsPeriod, string> = {
  day: "この日に予定されたタスクはありません",
  week: "この週に予定されたタスクはありません",
  month: "この月に予定されたタスクはありません",
  year: "この年に予定されたタスクはありません",
};

// 期間(日/週/月/年)ごとに、集計対象日の配列を組み立てる。どの期間でも
// computeStatsSummary()自体は「日付配列を渡せば日次で集計する」という
// 共通ロジックのままで、期間ごとの違いはこの日付配列の作り方と、
// (月/年表示の場合)日次結果をグラフ用にまとめ直す粒度だけに閉じている。
function buildPeriodDates(period: StatsPeriod, anchor: Date): Date[] {
  switch (period) {
    case "day":
      return [startOfDay(anchor)];
    case "week":
      return buildWeek(anchor);
    case "month":
      return buildMonthDates(anchor);
    case "year":
      return buildYearDates(anchor);
  }
}

function formatPeriodLabel(period: StatsPeriod, anchor: Date, dates: Date[]): string {
  switch (period) {
    case "day":
      return formatDayLabel(anchor);
    case "week":
      return formatWeekRangeLabel(dates[0], dates[dates.length - 1]);
    case "month":
      return formatMonthNumberLabel(anchor);
    case "year":
      return formatYearLabel(anchor);
  }
}

function movePeriodAnchor(period: StatsPeriod, anchor: Date, direction: 1 | -1): Date {
  switch (period) {
    case "day":
      return moveDayRange(anchor, 1, direction);
    case "week":
      return moveDayRange(anchor, 7, direction);
    case "month":
      return moveMonths(anchor, direction);
    case "year":
      return moveYears(anchor, direction);
  }
}

const StatsScreen = () => {
  const { dbManager } = useDatabaseManager();
  const [period, setPeriod] = useState<StatsPeriod>("week");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [items, setItems] = useState<SavedItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [completedIdsByDate, setCompletedIdsByDate] = useState<Map<string, Set<number>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 期間切り替え・週送り連打やフォーカス復帰の連続発火で複数回のloadData()が
  // 並行して走った時、先に発行した(古い期間の)リクエストが後から解決して
  // 新しい期間の結果を上書きしてしまわないよう、最後に発行したリクエストの
  // 結果だけを反映する。
  const requestIdRef = useRef(0);

  const dates = useMemo(() => buildPeriodDates(period, anchor), [period, anchor]);
  const rangeKey = `${period}:${createDateKey(dates[0])}:${createDateKey(dates[dates.length - 1])}`;

  const loadData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setErrorMessage(null);
    try {
      const [itemResult, categoryResult, completions] = await Promise.all([
        dbManager.itemRepository.findAllWithCategory(),
        dbManager.categoryRepository.findAll(),
        dbManager.itemRepository.findCompletionsInRange(
          createDateKey(dates[0]),
          createDateKey(dates[dates.length - 1]),
        ),
      ]);
      if (requestId !== requestIdRef.current) return;

      const byDate = new Map<string, Set<number>>();
      for (const { itemId, date } of completions) {
        const existing = byDate.get(date);
        if (existing) {
          existing.add(itemId);
        } else {
          byDate.set(date, new Set([itemId]));
        }
      }
      setItems(itemResult);
      setCategories(categoryResult);
      setCompletedIdsByDate(byDate);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setErrorMessage("統計の読み込みに失敗しました");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
    // rangeKeyだけを依存にし、対象期間(dates配列)が変わった時だけ読み直す
    // (datesは同じrangeKeyでも毎レンダー新しい配列参照になるため)。
  }, [dbManager, rangeKey]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const summary = useMemo(
    () => computeStatsSummary(items, categories, dates, completedIdsByDate),
    [items, categories, dates, completedIdsByDate],
  );

  const chartBars = useMemo(() => {
    switch (period) {
      case "week":
        return toWeekChartBars(summary.byDay);
      case "month":
        return groupDailyStatsByWeekOfMonth(summary.byDay);
      case "year":
        return groupDailyStatsByMonth(summary.byDay);
      case "day":
        return null;
    }
  }, [period, summary.byDay]);

  const completionRate = summary.scheduled > 0
    ? Math.round((summary.completed / summary.scheduled) * 100)
    : null;

  const categoryRows = useMemo(
    () => [...summary.byCategory].sort((left, right) => right.scheduled - left.scheduled),
    [summary.byCategory],
  );

  const priorityRows = useMemo(
    () => PRIORITY_OPTIONS.map((option) => {
      const stat = summary.byPriority.find((entry) => entry.key === option.value);
      return { label: option.label, value: option.value, scheduled: stat?.scheduled ?? 0, completed: stat?.completed ?? 0 };
    }),
    [summary.byPriority],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>統計</Text>
        <View style={styles.weekNav}>
          <TouchableOpacity
            style={styles.weekNavButton}
            onPress={() => setAnchor((current) => movePeriodAnchor(period, current, -1))}
            accessibilityRole="button"
            accessibilityLabel="前へ"
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.weekLabel}>{formatPeriodLabel(period, anchor, dates)}</Text>
          <TouchableOpacity
            style={styles.weekNavButton}
            onPress={() => setAnchor((current) => movePeriodAnchor(period, current, 1))}
            accessibilityRole="button"
            accessibilityLabel="次へ"
          >
            <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.periodGroup}>
          {PERIOD_OPTIONS.map((option, index) => {
            const selected = period === option.value;
            const isFirst = index === 0;
            const isLast = index === PERIOD_OPTIONS.length - 1;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setPeriod(option.value)}
                style={({ pressed }) => [
                  styles.periodButton,
                  !isFirst && styles.periodButtonJoined,
                  isFirst && styles.periodButtonFirst,
                  isLast && styles.periodButtonLast,
                  selected && styles.periodButtonSelected,
                  pressed && !selected && Platform.OS === "ios" && styles.periodButtonPressedIOS,
                ]}
              >
                <Text style={[styles.periodButtonText, selected && styles.periodButtonTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : errorMessage ? (
        <View style={styles.stateContainer}>
          <Text style={styles.emptyText}>{errorMessage}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{CARD_TITLES[period]}</Text>
            {summary.scheduled === 0 ? (
              <Text style={styles.emptyText}>{EMPTY_MESSAGES[period]}</Text>
            ) : (
              <>
                <View style={styles.heroRow}>
                  <Text style={styles.heroNumber}>{completionRate}</Text>
                  <Text style={styles.heroUnit}>%</Text>
                </View>
                <Text style={styles.heroDetail}>{summary.completed} / {summary.scheduled} 件完了</Text>
              </>
            )}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                <Text style={styles.legendText}>完了</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#D8DAE2" }]} />
                <Text style={styles.legendText}>未完了</Text>
              </View>
            </View>
            {chartBars ? (
              <PeriodCompletionChart bars={chartBars} />
            ) : summary.scheduled > 0 ? (
              <StatsProgressRow
                label="今日の進捗"
                color={colors.success}
                completed={summary.completed}
                scheduled={summary.scheduled}
              />
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>カテゴリ別</Text>
            {categoryRows.length === 0 ? (
              <Text style={styles.emptyText}>データがありません</Text>
            ) : (
              categoryRows.map((row) => (
                <StatsProgressRow
                  key={row.key}
                  label={row.category?.name ?? UNCATEGORIZED_LABEL}
                  color={row.category?.color ?? colors.tabInactive}
                  completed={row.completed}
                  scheduled={row.scheduled}
                  icon={<CategorySignatureIcon size={18} category={row.category} />}
                />
              ))
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>優先度別</Text>
            {priorityRows.map((row) => (
              <StatsProgressRow
                key={row.value}
                label={row.label}
                color={PRIORITY_COLORS[row.value]}
                completed={row.completed}
                scheduled={row.scheduled}
                icon={<View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[row.value] }]} />}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default StatsScreen;
