import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import type { RootStackParamList } from "../navigation/types";
import {
  CHEVRON_COLOR,
  CHEVRON_SIZE,
  settingsListStyles,
} from "../styles/settingsList.styles";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

const SettingsScreen = ({ navigation }: Props) => {
  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <TouchableOpacity
          style={settingsListStyles.row}
          onPress={() => navigation.navigate("Licenses")}
          activeOpacity={0.7}
        >
          <Text style={settingsListStyles.rowLabel}>ライセンス情報</Text>
          <Ionicons name="chevron-forward" size={CHEVRON_SIZE} color={CHEVRON_COLOR} />
        </TouchableOpacity>
        <View style={settingsListStyles.row}>
          <Text style={settingsListStyles.rowLabel}>アプリバージョン</Text>
          <Text style={settingsListStyles.rowValue}>
            {Constants.expoConfig?.version ?? "-"}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  section: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
});

export default SettingsScreen;
