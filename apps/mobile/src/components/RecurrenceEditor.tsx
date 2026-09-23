import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  DEFAULT_EVERY_N_DAYS,
  MAX_EVERY_N_DAYS,
  MIN_EVERY_N_DAYS,
  RECURRENCE_TYPE_OPTIONS,
  type Recurrence,
  type RecurrenceType,
} from "@milkbox/shared";
import { colors, spacing } from "../styles/tokens";

type RecurrenceSelectValue = RecurrenceType | "none";

const OPTIONS: readonly { value: RecurrenceSelectValue; label: string }[] = [
  { value: "none", label: "なし" },
  ...RECURRENCE_TYPE_OPTIONS,
];

interface RecurrenceEditorProps {
  value: Recurrence | null;
  onChange: (value: Recurrence | null) => void;
}

function clampDays(days: number): number {
  return Math.min(MAX_EVERY_N_DAYS, Math.max(MIN_EVERY_N_DAYS, days));
}

// 「なし/隔週/毎月/N日ごと」のセグメントコントロールと、N日ごと選択時だけ出す
// 日数入力をまとめたエディタ。AddTaskScreen(新規作成)とHomeScreenの編集モーダルの
// 両方から共通で使う。
export function RecurrenceEditor({ value, onChange }: RecurrenceEditorProps) {
  const selected: RecurrenceSelectValue = value?.type ?? "none";
  const [daysText, setDaysText] = useState(
    String(value?.type === "everyNDays" ? value.days : DEFAULT_EVERY_N_DAYS),
  );

  const selectType = (type: RecurrenceSelectValue) => {
    if (type === "none") {
      onChange(null);
      return;
    }
    if (type === "everyNDays") {
      const parsed = Number(daysText);
      onChange({ type: "everyNDays", days: clampDays(Number.isFinite(parsed) ? parsed : DEFAULT_EVERY_N_DAYS) });
      return;
    }
    onChange({ type });
  };

  const changeDays = (text: string) => {
    setDaysText(text);
    const parsed = Number(text);
    if (Number.isInteger(parsed) && parsed >= MIN_EVERY_N_DAYS && parsed <= MAX_EVERY_N_DAYS) {
      onChange({ type: "everyNDays", days: parsed });
    }
  };

  return (
    <View>
      <View style={styles.group}>
        {OPTIONS.map((option, index) => {
          const isSelected = selected === option.value;
          const isFirst = index === 0;
          const isLast = index === OPTIONS.length - 1;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              onPress={() => selectType(option.value)}
              style={({ pressed }) => [
                styles.button,
                !isFirst && styles.buttonJoined,
                isFirst && styles.buttonFirst,
                isLast && styles.buttonLast,
                isSelected && styles.buttonSelected,
                pressed && Platform.OS === "ios" && styles.buttonPressedIOS,
              ]}
            >
              <Text style={[styles.buttonText, isSelected && styles.buttonTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {selected === "everyNDays" ? (
        <View style={styles.daysRow}>
          <Text style={styles.daysLabel}>日数</Text>
          <TextInput
            style={styles.daysInput}
            value={daysText}
            onChangeText={changeDays}
            keyboardType="number-pad"
            accessibilityLabel="繰り返す日数"
          />
          <Text style={styles.daysLabel}>日ごと</Text>
        </View>
      ) : null}
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
    fontSize: 13,
    color: "#333",
    fontWeight: "600",
  },
  buttonTextSelected: {
    color: colors.onPrimary,
  },
  daysRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  daysLabel: {
    fontSize: 14,
    color: "#333",
  },
  daysInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    minWidth: 56,
    textAlign: "center",
  },
});
