import { useEffect, useMemo, useState } from "react";
import { Alert, View, Text, TouchableOpacity, StyleSheet, Switch } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import type { Calendar } from "expo-calendar";
import Constants from "expo-constants";
import type { RootStackParamList } from "../navigation/types";
import {
  CHEVRON_COLOR,
  CHEVRON_SIZE,
  settingsListStyles,
} from "../styles/settingsList.styles";
import { colors, spacing } from "../styles/tokens";
import { SelectModal, type SelectOption } from "../components/SelectModal";
import { useDatabaseManager } from "../contexts/DatabaseContext";
import {
  deleteAllTaskCalendarEventsAsync,
  getCalendarSyncSettings,
  getWritableCalendarsAsync,
  requestCalendarPermissionAsync,
  setCalendarSyncSettings,
} from "../services/calendarSync";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

const SettingsScreen = ({ navigation }: Props) => {
  const { dbManager } = useDatabaseManager();
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [calendarId, setCalendarId] = useState("");
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [calendarBusy, setCalendarBusy] = useState(false);

  useEffect(() => {
    void getCalendarSyncSettings().then((settings) => {
      setSyncEnabled(settings.enabled);
      setCalendarId(settings.calendarId ?? "");
    });
  }, []);

  const calendarOptions = useMemo<SelectOption[]>(
    () => calendars.map((calendar) => ({
      value: calendar.id,
      label: `${calendar.title}（${calendar.source?.name ?? calendar.ownerAccount ?? "端末"}）`,
    })),
    [calendars],
  );
  const selectedCalendarLabel = calendarOptions.find((option) => option.value === calendarId)?.label
    ?? (calendarId ? "選択済みのカレンダー" : "同期先を選択");

  const loadCalendars = async (): Promise<boolean> => {
    try {
      const writable = await getWritableCalendarsAsync();
      setCalendars(writable);
      if (writable.length === 0) {
        Alert.alert("同期できるカレンダーがありません", "端末の設定で、書き込み可能なカレンダーを追加してください。");
        return false;
      }
      return true;
    } catch (error) {
      console.warn("Failed to load calendars", error);
      Alert.alert("カレンダーを読み込めませんでした", "端末の設定でカレンダーへのアクセスを確認してください。");
      return false;
    }
  };

  const enableCalendarSync = async () => {
    setCalendarBusy(true);
    try {
      const granted = await requestCalendarPermissionAsync();
      if (!granted) {
        Alert.alert("アクセスが許可されていません", "端末の設定からMilkboxのカレンダーアクセスを許可してください。");
        return;
      }
      if (await loadCalendars()) setCalendarModalOpen(true);
    } catch (error) {
      console.warn("Failed to request calendar access", error);
      Alert.alert("カレンダーにアクセスできませんでした", "アプリを再起動して、もう一度お試しください。");
    } finally {
      setCalendarBusy(false);
    }
  };

  const handleSyncToggle = (enabled: boolean) => {
    if (enabled) {
      Alert.alert(
        "カレンダーへのアクセス",
        "カレンダー同期を有効にすると、同期先の一覧表示とタスクの追加・更新・削除のため、端末のカレンダーへのアクセス許可が必要です。",
        [
          { text: "キャンセル", style: "cancel" },
          { text: "続ける", onPress: () => { void enableCalendarSync(); } },
        ],
      );
      return;
    }

    setCalendarBusy(true);
    void deleteAllTaskCalendarEventsAsync(dbManager.itemRepository)
      .then(async () => {
        await setCalendarSyncSettings({ enabled: false, calendarId: null });
        setSyncEnabled(false);
        setCalendarId("");
      })
      .finally(() => setCalendarBusy(false));
  };

  const handleCalendarSelect = (selectedId: string) => {
    setCalendarModalOpen(false);
    setCalendarBusy(true);
    void setCalendarSyncSettings({ enabled: true, calendarId: selectedId })
      .then(async () => {
        setCalendarId(selectedId);
        setSyncEnabled(true);
        await dbManager.syncTaskCalendars();
      })
      .catch((error: unknown) => {
        console.warn("Failed to enable calendar sync", error);
        Alert.alert("同期を開始できませんでした", "時間をおいて、もう一度お試しください。");
      })
      .finally(() => setCalendarBusy(false));
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <View style={settingsListStyles.row}>
          <View style={styles.calendarLabel}>
            <Text style={settingsListStyles.rowLabel}>端末カレンダー同期</Text>
            <Text style={settingsListStyles.rowMeta}>Milkboxからカレンダーへの一方向同期</Text>
          </View>
          <Switch
            value={syncEnabled}
            disabled={calendarBusy}
            onValueChange={handleSyncToggle}
            trackColor={{ true: colors.primary }}
            accessibilityLabel="端末カレンダー同期"
          />
        </View>
        {syncEnabled || calendarModalOpen ? (
          <View style={styles.calendarRow}>
            <Text style={settingsListStyles.rowLabel}>同期先カレンダー</Text>
            <View style={styles.calendarSelect}>
              <SelectModal
                options={calendarOptions}
                selectedValue={calendarId}
                selectedLabel={selectedCalendarLabel}
                isOpen={calendarModalOpen}
                disabled={calendarBusy}
                accessibilityLabel="同期先カレンダー"
                emptyLabel="書き込み可能なカレンダーがありません"
                onToggle={() => {
                  void loadCalendars().then((loaded) => loaded && setCalendarModalOpen(true));
                }}
                onClose={() => setCalendarModalOpen(false)}
                onSelect={handleCalendarSelect}
              />
            </View>
          </View>
        ) : null}
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
    backgroundColor: colors.groupedBackground,
  },
  section: {
    marginTop: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  calendarLabel: {
    flex: 1,
    marginRight: spacing.md,
  },
  calendarRow: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  calendarSelect: {
    marginTop: spacing.sm,
  },
});

export default SettingsScreen;
