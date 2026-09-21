import type { Category } from "@milkbox/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CategorySignatureChip, CategorySignatureIcon } from "./CategorySignature";
import { CompletionStatusPill } from "./CompletionStatsCard";
import { styles as calendarStyles } from "../styles/screens/CalendarScreen.styles";
import { colors, radii, spacing } from "../styles/tokens";
import { getGanttBarAppearance } from "../utils/ganttBars";

type Props = {
  categories: Category[];
  selectedValue: string;
  onSelect: (value: string) => void;
};

export function SignatureSelector({ categories, selectedValue, onSelect }: Props) {
  const category = categories.find(candidate => candidate.id.toString() === selectedValue);
  if (categories.length === 0) return null;
  return <View style={styles.container}>
    {category ? <View style={styles.panel}>
      <View style={styles.heading}>
        <CategorySignatureIcon category={category} size={48} />
        <Text style={styles.name}>{category.name}</Text>
        <Text style={styles.badge}>選択中</Text>
      </View>
      <Text style={styles.description}>予定帯・カードにこのシグネチャーが使われます。</Text>
    </View> : null}
    <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel="カテゴリのクイック選択">
      {categories.map(option => <Pressable key={option.id} accessibilityRole="radio"
        accessibilityLabel={`${option.name}を選択`} accessibilityState={{ selected: option.id.toString() === selectedValue }}
        onPress={() => onSelect(option.id.toString())}
        style={[styles.choice, option.id.toString() === selectedValue && styles.choiceSelected]}>
        <CategorySignatureChip category={option} label={option.name} />
      </Pressable>)}
    </View>
    {category ? <View style={styles.preview}>
      <Text style={styles.title}>プレビュー</Text>
      <Text style={styles.description}>予定帯</Text>
      <View style={[styles.band, getGanttBarAppearance(category.color, true)]}>
        <CategorySignatureChip category={category} label={category.name} />
      </View>
      <Text style={styles.description}>カード</Text>
      <View style={calendarStyles.scheduleCard}>
        <View style={[calendarStyles.scheduleCardAccent, { backgroundColor: category.color }]} />
        <CategorySignatureChip category={category} label={category.name} />
        <Text style={[calendarStyles.scheduleText, styles.sample]}>牛乳を出す</Text>
        <CompletionStatusPill completed={false} />
      </View>
    </View> : null}
  </View>;
}
const styles = StyleSheet.create({
  container: { marginTop: spacing.md, gap: spacing.md },
  panel: { backgroundColor: colors.groupedBackground, borderRadius: radii.modal, padding: spacing.md },
  heading: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  badge: { color: colors.primary, backgroundColor: `${colors.primary}22`, borderRadius: radii.md, padding: spacing.xs, fontSize: 12, fontWeight: "600" },
  description: { fontSize: 12, color: colors.textSecondary, marginVertical: spacing.sm },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  choice: { maxWidth: "100%", borderWidth: 1, borderColor: "transparent", borderRadius: radii.md, padding: spacing.sm, backgroundColor: colors.groupedBackground },
  choiceSelected: { borderColor: colors.primary },
  title: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  preview: { gap: spacing.xs },
  band: { padding: spacing.sm, borderRadius: 6 },
  sample: { marginTop: spacing.sm },
});
