import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

const WEEKDAY_OPTIONS = [
  { value: 0, label: "日" },
  { value: 1, label: "月" },
  { value: 2, label: "火" },
  { value: 3, label: "水" },
  { value: 4, label: "木" },
  { value: 5, label: "金" },
  { value: 6, label: "土" },
] as const;

interface WeekdayButtonGroupProps {
  selectedWeekdays: number[];
  onToggleWeekday: (weekday: number) => void;
  disabled?: boolean;
}

export function WeekdayButtonGroup({
  selectedWeekdays,
  onToggleWeekday,
  disabled = false,
}: WeekdayButtonGroupProps) {
  return (
    <View style={styles.group}>
      {WEEKDAY_OPTIONS.map((weekday, index) => {
        const selected = selectedWeekdays.includes(weekday.value);
        const isFirst = index === 0;
        const isLast = index === WEEKDAY_OPTIONS.length - 1;

        return (
          <Pressable
            key={weekday.value}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            android_ripple={
              disabled
                ? undefined
                : {
                    color: selected ? "rgba(255,255,255,0.25)" : "rgba(0,122,255,0.14)",
                    borderless: false,
                  }
            }
            disabled={disabled}
            onPress={() => onToggleWeekday(weekday.value)}
            style={({ pressed }) => [
              styles.button,
              !isFirst && styles.buttonJoined,
              isFirst && styles.buttonFirst,
              isLast && styles.buttonLast,
              selected && styles.buttonSelected,
              pressed && !disabled && Platform.OS === "ios" && styles.buttonPressedIOS,
              disabled && styles.buttonDisabled,
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                selected && styles.buttonTextSelected,
                disabled && !selected && styles.buttonTextDisabled,
              ]}
            >
              {weekday.label}
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
    marginBottom: 14,
  },
  button: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
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
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
    zIndex: 1,
  },
  buttonPressedIOS: {
    opacity: 0.75,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  buttonTextSelected: {
    color: "#fff",
  },
  buttonTextDisabled: {
    color: "#666",
  },
});
