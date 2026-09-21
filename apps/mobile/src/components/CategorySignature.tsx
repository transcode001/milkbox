import { Ionicons } from "@expo/vector-icons";
import type { Category } from "@milkbox/shared";
import { StyleSheet, Text, View } from "react-native";
import { resolveCategoryIcon } from "../constants/categoryIcons";
import { colors } from "../styles/tokens";

type Props = { category?: Pick<Category, "color" | "icon">; size?: number };
export function CategorySignatureIcon({ category, size = 24 }: Props) {
  const color = category?.color ?? colors.tabInactive;
  return <View style={[styles.icon, { width: size, height: size, borderRadius: size / 2, backgroundColor: `${color}22` }]}>
    <Ionicons name={resolveCategoryIcon(category?.icon)} size={size * 0.65} color={color} />
  </View>;
}
// カテゴリ別のミニカード/チップ。CompletionStatsCard(Home「週の振り返り」・
// Calendar「今日の進捗」)から使われている。
export function CategorySignatureChip({ category, label }: Props & { label: string }) {
  return <View style={styles.chip}><CategorySignatureIcon category={category} /><Text style={styles.label}>{label}</Text></View>;
}
const styles = StyleSheet.create({
  icon: { alignItems: "center", justifyContent: "center" },
  chip: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { color: colors.textPrimary, flexShrink: 1 },
});
