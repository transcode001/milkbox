import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { PRIORITY_OPTIONS, type Priority } from "@milkbox/shared";
import { colors } from "../styles/tokens";

interface PriorityButtonGroupProps {
  value: Priority;
  onChange: (priority: Priority) => void;
  disabled?: boolean;
}

// WeekdayButtonGroupと同じsegmented control見た目だが、複数選択のトグルではなく
// 単一選択(排他)のため別コンポーネントにしている。
export function PriorityButtonGroup({ value, onChange, disabled = false }: PriorityButtonGroupProps) {
  return (
    <View style={styles.group}>
      {PRIORITY_OPTIONS.map((option, index) => {
        const selected = value === option.value;
        const isFirst = index === 0;
        const isLast = index === PRIORITY_OPTIONS.length - 1;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.button,
              !isFirst && styles.buttonJoined,
              isFirst && styles.buttonFirst,
              isLast && styles.buttonLast,
              selected && styles.buttonSelected,
              pressed && !disabled && Platform.OS === "ios" && styles.buttonPressedIOS,
            ]}
          >
            <Text style={[styles.buttonText, selected && styles.buttonTextSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: "row",
    width: "100%",
  },
  button: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  buttonJoined: {
    marginLeft: -1,
  },
  buttonFirst: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  buttonLast: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  buttonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    zIndex: 1,
  },
  buttonPressedIOS: {
    opacity: 0.75,
  },
  buttonText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  buttonTextSelected: {
    color: colors.onPrimary,
  },
});
