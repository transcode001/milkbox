import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../styles/tokens";

type UndoSnackbarProps = {
  message: string;
  actionLabel?: string;
  onAction: () => void;
};

// 削除のUndo用スナックバー。他画面のモーダル同様この機能専用の小さいコンポーネントで、
// 表示/非表示や消えるまでのタイマーは呼び出し側(HomeScreen)が管理する。
export const UndoSnackbar = ({ message, actionLabel = "元に戻す", onAction }: UndoSnackbarProps) => (
  <View style={styles.container} pointerEvents="box-none">
    <View style={styles.bar}>
      <Text style={styles.message} numberOfLines={1}>
        {message}
      </Text>
      <TouchableOpacity onPress={onAction} accessibilityRole="button" hitSlop={8}>
        <Text style={styles.actionText}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    // Material Designの標準的なスナックバー色。このアプリはダークモード非対応の
    // ライトテーマ前提なので、colors側にトークン化はせずここで完結させている。
    backgroundColor: "#323232",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  message: {
    flex: 1,
    color: colors.onPrimary,
    fontSize: 14,
  },
  actionText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
});
