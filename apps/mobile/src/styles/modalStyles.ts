import { StyleSheet } from "react-native";
import { colors } from "./tokens";

// 各画面のモーダルのキャンセルボタン文字色。colors.cancelBackground(明るい背景)に
// 対して十分なコントラストを持たせるため、共通スタイルとして一箇所で管理する。
export const modalStyles = StyleSheet.create({
  modalButtonCancelText: {
    color: colors.textPrimary,
  },
});
