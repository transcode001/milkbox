import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
} from "react-native";
import { COLOR_PALETTE } from "../constants/colors";
import { colors } from "../styles/tokens";

type ColorPickerProps = {
  value: string;
  defaultColor: string;
  onChange: (color: string) => void;
};

type PanelPosition = { top: number; left: number };

// スウォッチグリッド(1行11個 + デフォルトボタン)が収まる固定幅。
// トリガー(色ドット+シェブロンだけの小さいピル)の実測幅では中身が入り切らないため、
// パネル自体の幅はトリガーの計測値から独立させている。
const PANEL_WIDTH = 320;

export const ColorPicker = ({ value, defaultColor, onChange }: ColorPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<PanelPosition>({ top: 0, left: 0 });
  const triggerRef = useRef<View>(null);

  const openPicker = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    triggerRef.current?.measureInWindow((x, y, _width, height) => {
      setPanelPosition({ top: y + height + 6, left: x });
      setIsOpen(true);
    });
  };

  return (
    <View ref={triggerRef} collapsable={false}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel="色を選択"
        accessibilityState={{ expanded: isOpen }}
      >
        <View style={[styles.triggerColor, { backgroundColor: value }]} />
        <Ionicons name="chevron-down" size={14} color={colors.textPrimary} />
      </TouchableOpacity>

      <Modal visible={isOpen} transparent={true} animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <Pressable
            style={[
              styles.panel,
              {
                top: panelPosition.top,
                left: panelPosition.left,
                width: PANEL_WIDTH,
              },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.paletteRows}>
              {Object.entries(COLOR_PALETTE).map(([group, palette]) => (
                <View key={group} style={styles.paletteRow}>
                  {palette.map((color) => {
                    const selected = value === color;
                    return (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorButtonOutline,
                          selected && styles.colorButtonOutlineSelected,
                        ]}
                        onPress={() => onChange(color)}
                        accessibilityRole="radio"
                        accessibilityLabel={color}
                        accessibilityState={{ selected }}
                      >
                        <View style={[styles.colorButton, { backgroundColor: color }]} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={styles.divider} />
            <TouchableOpacity style={styles.defaultButton} onPress={() => onChange(defaultColor)}>
              <View style={[styles.defaultColor, { backgroundColor: defaultColor }]}>
                <Ionicons name="checkmark" size={20} color={colors.onPrimary} />
              </View>
              <Text style={styles.defaultText}>デフォルト</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
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
  triggerColor: { width: 20, height: 20, borderRadius: 10 },
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
  paletteRows: { gap: 8 },
  paletteRow: { flexDirection: "row", justifyContent: "space-between", gap: 3 },
  colorButtonOutline: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  colorButtonOutlineSelected: { borderWidth: 2, borderColor: "#1A1A1A" },
  colorButton: { width: 24, height: 24, borderRadius: 12 },
  divider: { borderTopWidth: 1, borderTopColor: "#D8DAE2", marginVertical: 12 },
  defaultButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#E8EAF0",
  },
  defaultColor: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  defaultText: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
});
