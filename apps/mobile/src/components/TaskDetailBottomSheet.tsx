import { useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  REMINDER_OPTIONS,
  resolveReminderMinutesToRestore,
  type SavedItem,
} from "@milkbox/shared";
import { colors, radii, spacing } from "../styles/tokens";
import { useDatabaseManager } from "../contexts/DatabaseContext";
import { formatScheduleTime, resolveDisplayColor, UNCATEGORIZED_LABEL } from "../utils/scheduleGrouping";
import { WEEKDAY_LABELS } from "../utils/weekdays";

interface TaskDetailBottomSheetProps {
  item: SavedItem | null;
  // このシートを開くきっかけになった、カレンダー上でタップした具体的な日付
  // (繰り返し/複数日タスクは日によって発生有無が変わるため、item自体の
  // startDateではなくタップされた実際の日を見出しの日付表示に使う)。
  occurrenceDate: Date | null;
  onClose: () => void;
  onEdit: (item: SavedItem) => void;
  // 通知切り替え・削除の後に呼ばれる。呼び出し側は一覧の再読み込みなど、
  // 自分の状態を最新化する処理をここで行う。
  onChanged: () => void | Promise<void>;
}

function formatOccurrenceDateLabel(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日（${WEEKDAY_LABELS[date.getDay()]}）`;
}

function formatReminderLabel(item: SavedItem): string {
  if (!item.notificationEnabled) return "通知なし";
  const option = REMINDER_OPTIONS.find((candidate) => candidate.minutes === item.notificationMinutesBefore);
  return option?.label ?? "通知あり";
}

// CalendarScreenのタイムライン(WeekTimeline)でタスクをタップした時に開く詳細シート。
// Figmaの「Task Detail - Bottom Sheet」に対応。編集フォーム自体はHomeScreenと
// 共通のEditItemModalを使う(このシートは編集ボタンで自身を閉じてから
// onEditを呼ぶだけで、フォームは持たない)。
export function TaskDetailBottomSheet({ item, occurrenceDate, onClose, onEdit, onChanged }: TaskDetailBottomSheetProps) {
  const { dbManager } = useDatabaseManager();
  const [busy, setBusy] = useState(false);

  if (!item) return null;

  const color = resolveDisplayColor(item);
  const categoryLabel = item.categoryName ?? UNCATEGORIZED_LABEL;
  const timeLabel = formatScheduleTime(item);
  const dateTimeLabel = occurrenceDate ? `${formatOccurrenceDateLabel(occurrenceDate)} ${timeLabel}` : timeLabel;

  const handleEdit = () => {
    onClose();
    onEdit(item);
  };

  const handleToggleNotification = async () => {
    if (busy) return;
    setBusy(true);
    const enabled = !item.notificationEnabled;
    // HomeScreenの一覧ベルアイコンと同じ方針: 無効化してもnotificationMinutesBeforeを
    // 上書きせず、再度有効化した時に元のタイミングへ戻せるようにする。
    const notificationMinutesBefore = enabled
      ? resolveReminderMinutesToRestore(item.notificationMinutesBefore)
      : item.notificationMinutesBefore;
    try {
      await dbManager.updateItem(item.id, { notificationEnabled: enabled, notificationMinutesBefore });
      await onChanged();
    } catch {
      Alert.alert("エラー", "通知設定の更新に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const deleteItem = async () => {
    setBusy(true);
    try {
      await dbManager.deleteItem(item.id);
      onClose();
      await onChanged();
    } catch {
      Alert.alert("エラー", "予定の削除に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("この予定を削除しますか？", item.text, [
      { text: "キャンセル", style: "cancel" },
      { text: "削除", style: "destructive", onPress: () => void deleteItem() },
    ]);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="閉じる">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.dragHandle} />
          <View style={styles.headerRow}>
            <View style={[styles.categoryPill, { backgroundColor: `${color}22` }]}>
              <View style={[styles.categoryDot, { backgroundColor: color }]} />
              <Text style={[styles.categoryPillText, { color }]} numberOfLines={1}>{categoryLabel}</Text>
            </View>
            <Text style={styles.reminderText}>{formatReminderLabel(item)}</Text>
          </View>
          <Text style={styles.title}>{item.text}</Text>
          <Text style={styles.dateTime}>{dateTimeLabel}</Text>
          <View style={styles.divider} />
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={handleEdit}
              disabled={busy}
            >
              <Ionicons name="pencil" size={16} color={colors.onPrimary} />
              <Text style={styles.editButtonText}>編集する</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.notificationButton]}
              onPress={() => void handleToggleNotification()}
              disabled={busy}
              accessibilityRole="switch"
              accessibilityLabel="通知設定"
              accessibilityState={{ checked: item.notificationEnabled, disabled: busy }}
            >
              <Ionicons
                name={item.notificationEnabled ? "notifications" : "notifications-off-outline"}
                size={16}
                color={colors.primary}
              />
              <Text style={styles.notificationButtonText}>通知設定</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.deleteRow} onPress={handleDelete} disabled={busy}>
            <Text style={styles.deleteText}>この予定を削除する</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.modal,
    borderTopRightRadius: radii.modal,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  dragHandle: {
    alignSelf: "center",
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D8DAE2",
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
    flexShrink: 1,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  reminderText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  dateTime: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: spacing.lg,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  editButton: {
    backgroundColor: colors.primary,
  },
  editButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  notificationButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  notificationButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  deleteRow: {
    alignItems: "center",
    paddingVertical: 8,
  },
  deleteText: {
    color: colors.destructive,
    fontSize: 14,
    fontWeight: "600",
  },
});
