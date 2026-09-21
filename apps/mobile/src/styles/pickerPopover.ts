import { StyleSheet } from "react-native";

// ColorPicker/IconPickerはどちらも「小さいpillトリガー→ポップオーバーで
// グリッド表示」という同じ見た目のパターンを使う。トリガー/パネルの色・角丸・
// シャドウはこの2箇所で完全に一致していたため、ここに切り出して重複をなくす。
// パネル内部のレイアウト(行ごとに並べる/折り返すグリッドにする等)は各Picker側で
// 個別のスタイルを追加で合成すること。
export const pickerPopoverStyles = StyleSheet.create({
  trigger: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 20,
    backgroundColor: "#E8EAF0",
  },
  backdrop: { flex: 1 },
  panel: {
    position: "absolute",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#F2F3F7",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});
