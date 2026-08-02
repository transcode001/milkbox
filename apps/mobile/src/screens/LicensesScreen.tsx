import { useState } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { licenses, licenseTexts, type LicenseEntry } from "../data/licenses";
import {
  CHEVRON_COLOR,
  CHEVRON_SIZE,
  settingsListStyles,
} from "../styles/settingsList.styles";
import { colors } from "../styles/tokens";

// 同名パッケージが複数バージョン含まれるため name 単体はキーにできない
const entryKey = (item: LicenseEntry) => `${item.name}@${item.version}`;

const LicensesScreen = () => {
  const insets = useSafeAreaInsets();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const renderItem = ({ item }: { item: LicenseEntry }) => {
    const key = entryKey(item);
    const expanded = expandedKey === key;
    const hasText = item.licenseTextIndex !== null;

    return (
      <View>
        <TouchableOpacity
          style={settingsListStyles.row}
          onPress={() => setExpandedKey(expanded ? null : key)}
          activeOpacity={0.7}
          disabled={!hasText}
        >
          <View style={styles.itemTextContainer}>
            <Text style={settingsListStyles.rowTitle}>{item.name}</Text>
            <Text style={settingsListStyles.rowMeta}>
              {item.version} / {item.license}
            </Text>
          </View>
          {hasText ? (
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={CHEVRON_SIZE}
              color={CHEVRON_COLOR}
            />
          ) : null}
        </TouchableOpacity>
        {expanded && item.licenseTextIndex !== null ? (
          <Text style={styles.licenseText}>
            {licenseTexts[item.licenseTextIndex]}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingBottom: insets.bottom + 8 },
      ]}
      data={licenses}
      keyExtractor={entryKey}
      renderItem={renderItem}
      ListEmptyComponent={
        <Text style={styles.emptyText}>ライセンス情報がありません。</Text>
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingTop: 8,
  },
  itemTextContainer: {
    flexShrink: 1,
    paddingRight: 12,
  },
  licenseText: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 12,
    lineHeight: 18,
    color: "#666",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  emptyText: {
    padding: 20,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});

export default LicensesScreen;
