import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "../styles/tokens";

type Props = {
  text: string;
  completed: boolean;
  disabled: boolean;
  onPress: () => void;
};

export function CompletionCheckbox({ text, completed, disabled, onPress }: Props) {
  return (
    <TouchableOpacity
      style={completionStyles.checkbox}
      accessibilityRole="checkbox"
      accessibilityLabel={`${text}の完了`}
      accessibilityState={{ checked: completed, disabled }}
      disabled={disabled}
      onPress={onPress}
    >
      <Ionicons
        name={completed ? "checkbox" : "square-outline"}
        size={24}
        color={completed ? colors.textSecondary : colors.primary}
      />
    </TouchableOpacity>
  );
}

export const completionStyles = StyleSheet.create({
  checkbox: { width: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  completedText: { textDecorationLine: "line-through", color: colors.textSecondary },
});
