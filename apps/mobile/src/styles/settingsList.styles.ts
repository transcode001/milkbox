import { StyleSheet } from "react-native";

// 設定系画面（Settings / Licenses）で共通のリスト行スタイル
export const CHEVRON_SIZE = 18;
export const CHEVRON_COLOR = "#999";

export const settingsListStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
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
    color: "#999",
  },
  rowMeta: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
});
