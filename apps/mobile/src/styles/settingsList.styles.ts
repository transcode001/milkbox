import { StyleSheet } from "react-native";
import { colors, spacing } from "./tokens";

// 設定系画面（Settings / Licenses）で共通のリスト行スタイル
export const CHEVRON_SIZE = 18;
export const CHEVRON_COLOR = colors.textSecondary;

export const settingsListStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rowLabel: {
    fontSize: 15,
    color: "#333",
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  rowValue: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  rowMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
