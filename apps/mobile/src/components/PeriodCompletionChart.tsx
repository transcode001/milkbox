import { StyleSheet, Text, View } from "react-native";
import type { ChartBar } from "../utils/completionStats";
import { colors, spacing } from "../styles/tokens";

const CHART_HEIGHT = 96;
const MIN_BAR_HEIGHT = 3;

interface PeriodCompletionChartProps {
  bars: ChartBar[];
}

// 完了(緑)/未完了(グレー)の積み上げ棒を並べる。週表示なら曜日、月表示なら
// 週番号、年表示なら月、というように呼び出し側がbarのlabelを決める。
// どちらも状態色であってカテゴリ/優先度の識別色ではないため、凡例は画面に
// 1つだけ置けば十分(呼び出し側のStatsScreenで表示する)。
export function PeriodCompletionChart({ bars }: PeriodCompletionChartProps) {
  const maxScheduled = Math.max(1, ...bars.map((bar) => bar.scheduled));

  return (
    <View style={styles.row}>
      {bars.map((bar) => {
        const remaining = bar.scheduled - bar.completed;
        // 完了0件の区間(未来や、予定はあっても未完了の区間を含む)に最低高さの
        // 緑を出すと「完了した」ように見えてしまうため、completed > 0の時だけ
        // 最低高さを底上げする。
        const completedHeight = bar.completed > 0
          ? Math.max(MIN_BAR_HEIGHT, (bar.completed / maxScheduled) * CHART_HEIGHT)
          : 0;
        const remainingHeight = remaining > 0
          ? Math.max(MIN_BAR_HEIGHT, (remaining / maxScheduled) * CHART_HEIGHT)
          : 0;

        return (
          <View key={bar.key} style={styles.column}>
            <Text style={styles.countLabel}>{bar.scheduled > 0 ? bar.scheduled : ""}</Text>
            <View style={styles.barTrack}>
              {remainingHeight > 0 ? (
                <View
                  testID={`remaining-${bar.key}`}
                  style={[styles.segment, styles.remainingSegment, { height: remainingHeight }]}
                />
              ) : null}
              {completedHeight > 0 ? (
                <View
                  testID={`completed-${bar.key}`}
                  style={[styles.segment, styles.completedSegment, { height: completedHeight }]}
                />
              ) : null}
            </View>
            <Text style={styles.barLabel} testID={`bar-label-${bar.key}`}>{bar.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: CHART_HEIGHT + 40,
  },
  column: {
    flex: 1,
    alignItems: "center",
  },
  countLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
    height: 14,
  },
  barTrack: {
    width: 16,
    height: CHART_HEIGHT,
    justifyContent: "flex-end",
  },
  segment: {
    width: "100%",
  },
  // 積み上げ区間の間に薄い区切りを作るため、上側(remaining)にだけ下マージンを入れる。
  // カード自体の背景色がcolors.groupedBackgroundのため、同じ色は使わず
  // (使うと見えなくなる)、既存のColorPicker区切り線と同じ濃さのグレーにする。
  remainingSegment: {
    backgroundColor: "#D8DAE2",
    marginBottom: 2,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  completedSegment: {
    backgroundColor: colors.success,
    borderRadius: 3,
  },
  barLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
