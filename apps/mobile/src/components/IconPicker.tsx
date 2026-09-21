import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { CATEGORY_ICON_OPTIONS, resolveCategoryIcon } from "../constants/categoryIcons";
import { pickerPopoverStyles } from "../styles/pickerPopover";
import { colors } from "../styles/tokens";

export function IconPicker({ value, color, onChange }: { value?: string; color: string; onChange: (icon: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<View>(null);
  const { width, height } = useWindowDimensions();
  const panelWidth = Math.min(264, width - 24);
  return <View ref={triggerRef} collapsable={false}>
    <Pressable style={pickerPopoverStyles.trigger} accessibilityRole="button" accessibilityLabel="アイコンを選択" accessibilityState={{ expanded: isOpen }}
      onPress={() => triggerRef.current?.measureInWindow((x, y, _width, triggerHeight) => {
        setPosition({ left: Math.max(12, Math.min(x, width - panelWidth - 12)), top: Math.max(12, Math.min(y + triggerHeight + 6, height - 180)) });
        setIsOpen(true);
      })}>
      <Ionicons name={resolveCategoryIcon(value)} size={20} color={color} />
      <Ionicons name="chevron-down" size={14} color={colors.textPrimary} />
    </Pressable>
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
      <Pressable style={pickerPopoverStyles.backdrop} onPress={() => setIsOpen(false)}>
        <Pressable style={[pickerPopoverStyles.panel, styles.panelGrid, position, { width: panelWidth }]} onPress={event => event.stopPropagation()}>
          {CATEGORY_ICON_OPTIONS.map(option => <Pressable key={option.name} accessibilityRole="radio" accessibilityLabel={option.label}
            accessibilityState={{ selected: resolveCategoryIcon(value) === option.name }}
            style={[styles.option, resolveCategoryIcon(value) === option.name && styles.selected]}
            onPress={() => { onChange(option.name); setIsOpen(false); }}>
            <Ionicons name={option.name} size={24} color={color} />
          </Pressable>)}
        </Pressable>
      </Pressable>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  // trigger/panelの見た目(色・角丸・シャドウ)はColorPickerと共通なのでpickerPopoverStylesを
  // 使う。ここにはIconPicker固有のグリッドレイアウトだけを残す。
  panelGrid: { flexDirection: "row", flexWrap: "wrap" },
  option: { width: "20%", height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  selected: { borderWidth: 2, borderColor: colors.textPrimary },
});
