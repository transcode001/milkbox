import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../styles/tokens";

interface StatsProgressRowProps {
  label: string;
  color: string;
  completed: number;
  scheduled: number;
  icon?: React.ReactNode;
}

// カテゴリ別・優先度別の内訳で共通して使う「ラベル+進捗バー+件数」の1行。
// バーの色は呼び出し側が渡す(カテゴリ色 or 優先度色)ことで、達成/未達成の
// 状態色(success/グレー)とは別に「どの区分か」を示す。
export function StatsProgressRow({ label, color, completed, scheduled, icon }: StatsProgressRowProps) {
  const ratio = scheduled > 0 ? completed / scheduled : 0;

  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        {icon}
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        <Text style={styles.count}>{completed}/{scheduled}</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${Math.round(ratio * 100)}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  label: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  count: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  track: {
    height: 8,
    borderRadius: radii.sm,
    // StatsScreenのカード自体がcolors.groupedBackgroundなので、同じ色だと
    // トラックが見えなくなる。WeeklyCompletionChartの未完了セグメントと
    // 同じ濃さのグレーに揃える。
    backgroundColor: "#D8DAE2",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radii.sm,
  },
});
