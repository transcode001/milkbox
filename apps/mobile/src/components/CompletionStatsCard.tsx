import { StyleSheet, Text, View } from "react-native";
import { CategorySignatureChip } from "./CategorySignature";
import { colors, radii, spacing } from "../styles/tokens";
import type { countCategoryOccurrences } from "../utils/completionStats";

type Props = {
  title: string;
  completed: number | null;
  total?: number;
  error?: boolean;
  groups: ReturnType<typeof countCategoryOccurrences>;
  showCounts?: boolean;
};
export function CompletionStatsCard({ title, completed, total, groups, showCounts, error }: Props) {
  return <View style={styles.card}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.summary} accessibilityLiveRegion="polite">
      {error ? "完了件数を取得できませんでした" : completed === null ? "完了件数を読み込み中" : `${completed}${total === undefined ? "件完了" : ` / ${total}件完了`}`}
    </Text>
    <View style={styles.groups}>
      {groups.map(group => <View key={group.key} style={styles.group}>
        <CategorySignatureChip category={group.category} label={`${group.category?.name ?? "カテゴリ指定なし"}${showCounts ? ` ${group.count}件` : ""}`} />
      </View>)}
    </View>
  </View>;
}
export function CompletionStatusPill({ completed }: { completed: boolean }) {
  const color = completed ? colors.success : colors.pending;
  return <Text style={[styles.pill, { color, backgroundColor: `${color}22` }]}>{completed ? "完了" : "予定中"}</Text>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.groupedBackground, padding: spacing.lg, borderRadius: radii.modal, marginBottom: spacing.lg },
  title: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  summary: { fontSize: 18, fontWeight: "600", color: colors.textPrimary, marginVertical: spacing.sm },
  groups: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  group: { backgroundColor: colors.background, padding: spacing.sm, borderRadius: radii.md, maxWidth: "100%" },
  pill: { alignSelf: "flex-start", fontSize: 11, fontWeight: "600", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, overflow: "hidden", marginTop: 4 },
});
