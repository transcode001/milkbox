import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { WEEKDAY_LABELS } from "../utils/weekdays";
import { colors } from "../styles/tokens";

const WEEKDAY_OPTIONS = WEEKDAY_LABELS.map((label, value) => ({ value, label }));

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
                    // colors.primaryの16進数に透過度(約14%)のhexサフィックスを付与し、
                    // Android/iOSどちらでもbuttonSelectedの背景色と同系色のrippleにする。
                    color: selected ? "rgba(255,255,255,0.25)" : `${colors.primary}24`,
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
              // 選択中（引き継ぎ曜日）は無効時もフル彩度のまま強調を維持する
              disabled && !selected && styles.buttonDisabled,
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
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  buttonJoined: {
    marginLeft: -1,
  },
  buttonFirst: {
    // radii.mdはAndroidで20になり、44pt高の連結ボタン端が半円状のピル型になってしまうため、
    // segmented controlの控えめな角丸として固定値を使う。
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
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  buttonTextSelected: {
    color: colors.onPrimary,
  },
  buttonTextDisabled: {
    color: colors.textSecondary,
  },
});
