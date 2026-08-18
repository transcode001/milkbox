import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing } from "../styles/tokens";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectModalProps {
  options: SelectOption[];
  selectedValue: string;
  selectedLabel: string;
  isOpen: boolean;
  disabled?: boolean;
  accessibilityLabel: string;
  emptyLabel?: string;
  footer?: React.ReactNode;
  renderOptionAction?: (option: SelectOption) => React.ReactNode;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (value: string) => void;
}

export const SelectModal = ({
  options,
  selectedValue,
  selectedLabel,
  isOpen,
  disabled = false,
  accessibilityLabel,
  emptyLabel = "選択肢がありません",
  footer,
  renderOptionAction,
  onToggle,
  onClose,
  onSelect,
}: SelectModalProps) => (
  <>
    <TouchableOpacity
      style={[styles.disclosure, disabled && styles.disclosureDisabled]}
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ expanded: isOpen, disabled }}
    >
      <Text style={styles.disclosureText}>{selectedLabel}</Text>
      <Ionicons
        name={isOpen ? "chevron-up" : "chevron-down"}
        size={20}
        color={colors.textSecondary}
      />
    </TouchableOpacity>

    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}を閉じる`}
      >
        <Pressable style={styles.optionList} onPress={(event) => event.stopPropagation()}>
          <ScrollView
            style={styles.optionsScroll}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {options.length === 0 ? (
              <View style={styles.emptyOption}>
                <Text style={styles.emptyOptionText}>{emptyLabel}</Text>
              </View>
            ) : null}
            {options.map((option) => {
              const selected = option.value === selectedValue;

              return (
                <View
                  key={option.value}
                  style={[styles.optionRow, selected && styles.optionSelected]}
                >
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={() => onSelect(option.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={styles.optionText}>{option.label}</Text>
                    {selected ? (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                  {renderOptionAction?.(option)}
                </View>
              );
            })}
          </ScrollView>
          {footer}
        </Pressable>
      </Pressable>
    </Modal>
  </>
);

const styles = StyleSheet.create({
  disclosure: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.tabInactive,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
  },
  disclosureDisabled: {
    opacity: 0.5,
  },
  disclosureText: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  optionList: {
    minHeight: 96,
    maxHeight: 360,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.tabInactive,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.background,
  },
  optionsScroll: {
    maxHeight: 312,
  },
  optionRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "stretch",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.tabInactive,
  },
  optionSelected: {
    backgroundColor: colors.groupedBackground,
  },
  optionButton: {
    flex: 1,
    flexBasis: 0,
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  emptyOption: {
    minHeight: 48,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyOptionText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
