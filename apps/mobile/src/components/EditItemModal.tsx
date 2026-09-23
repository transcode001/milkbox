import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { DEFAULT_PRIORITY, type Priority, type Recurrence, type SavedItem } from "@milkbox/shared";
import { styles } from "../styles/screens/HomeScreen.styles";
import { modalStyles } from "../styles/modalStyles";
import { colors } from "../styles/tokens";
import { useDatabaseManager } from "../contexts/DatabaseContext";
import { useTags } from "../hooks/useTags";
import { isEndDateBeforeStartDate } from "../utils/dateValidation";
import { PriorityButtonGroup } from "./PriorityButtonGroup";
import { TagEditor } from "./TagEditor";
import { RecurrenceEditor } from "./RecurrenceEditor";
import { SelectModal } from "./SelectModal";
import { mergeDatePart, mergeTimePart } from "../hooks/useDatePicker";
import { REMINDER_SELECT_OPTIONS, useReminderPicker } from "../hooks/useReminderPicker";

// ベルアイコンで示す「通知タイミング」欄の有効時の色。#333は他の暗めの本文色
// (dateSelectorButtonTextなど)と同じくFigma上のraw hexで、textPrimary(黒)/
// textSecondary(#666)どちらのトークンとも一致しないためそのまま踏襲している。
const NOTIFICATION_ENABLED_COLOR = "#333";

// utils/calendarDates.ts の parseItemDate/parsePointDate と似ているが別物。
// あちらは「時刻を落として日付だけにする」「日付のみの文字列は9時扱いにする」
// といったカレンダー表示向けの正規化を行うのに対し、ここはタスク編集
// フォームの初期値としてstartDate/endDateをそのままDateへ変換したいだけ
// (時刻も保持する)ため、意図的に正規化していない。
const parseOptionalDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatItemDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}.${month}.${day} ${hour}:${minute}`;
};

interface EditItemModalProps {
  item: SavedItem | null;
  onClose: () => void;
  // 保存成功後に呼ばれる。呼び出し側は一覧の再読み込みなど、自分の状態を
  // 最新化する処理をここで行う(このコンポーネント自身は保存先の一覧を
  // 持たないため)。
  onSaved: () => void | Promise<void>;
}

// HomeScreen(タスク一覧)とCalendarScreen(タスク詳細ボトムシート)の
// どちらからも同じ編集フォームを開けるよう、以前HomeScreen内にあった
// 編集モーダルを共通コンポーネントとして切り出したもの。
export function EditItemModal({ item, onClose, onSaved }: EditItemModalProps) {
  const { dbManager } = useDatabaseManager();
  const { tags, loadTags, createTag } = useTags({ dbManager });
  const [text, setText] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [priority, setPriority] = useState<Priority>(DEFAULT_PRIORITY);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [recurrence, setRecurrence] = useState<Recurrence | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<"start" | "end" | null>(null);
  const reminder = useReminderPicker();

  useEffect(() => {
    if (!item) return;
    setText(item.text);
    setStartDate(parseOptionalDate(item.startDate));
    setEndDate(parseOptionalDate(item.endDate));
    setPriority(item.priority);
    // itemに既にtagsが載っていれば(HomeScreenの一覧のように事前に紐付け済みの
    // 場合)それを暫定値として即座に反映しつつ、下のfindTagsForItem()で必ず
    // DBから最新のタグ紐付けを取り直す。CalendarScreenのfindAllWithCategory()は
    // タグを含めないため、item.tagsに頼るだけだと常に空配列になり、保存時に
    // 既存のタグ付けを全て消してしまう(呼び出し元ごとにタグ取得の有無が
    // 異なることに依存しない実装にする)。
    setTagIds((item.tags ?? []).map((tag) => tag.id));
    setRecurrence(item.recurrence ?? null);
    setShowDatePicker(null);
    // 一覧のベルアイコンは無効化してもnotificationMinutesBeforeを上書きしない
    // ため、現在は無効でも実際の値が残っていることがある。useReminderPicker側も
    // notificationEnabledではなくnotificationMinutesBefore自体を見て復元用の
    // 値を決める。
    reminder.resetReminder(item.notificationMinutesBefore, item.notificationEnabled);
    void loadTags();

    let cancelled = false;
    void dbManager.tagRepository.findTagsForItem(item.id).then((itemTags) => {
      if (cancelled) return;
      setTagIds(itemTags.map((tag) => tag.id));
    });
    // itemが変わった時だけ内部状態を初期化し直したい(毎レンダーではない)ため、
    // dbManager/reminder/loadTagsをあえて依存に含めない。連続してitemが
    // 切り替わった時、古いitemのfindTagsForItem()が後から解決して新しいitemの
    // tagIdsを上書きしないようキャンセルフラグで防ぐ。
    return () => {
      cancelled = true;
    };
  }, [item]);

  const toggleTag = (tagId: number) => {
    setTagIds((current) => (current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]));
  };

  const addNewTag = async (name: string): Promise<boolean> => {
    const tag = await createTag(name);
    if (!tag) return false;
    setTagIds((current) => (current.includes(tag.id) ? current : [...current, tag.id]));
    return true;
  };

  const handleSave = async () => {
    if (!item) return;

    const trimmedText = text.trim();
    if (!trimmedText) {
      Alert.alert("エラー", "内容を入力してください");
      return;
    }

    if (isEndDateBeforeStartDate(startDate, endDate)) {
      Alert.alert("エラー", "終了日時が開始日時より前です。終了日時を再設定してください。");
      return;
    }

    if (recurrence && !startDate) {
      Alert.alert("エラー", "繰り返しには開始日を設定してください");
      return;
    }

    try {
      await dbManager.updateItem(item.id, {
        text: trimmedText,
        startDate: startDate?.toISOString() ?? null,
        endDate: endDate?.toISOString() ?? null,
        notificationEnabled: reminder.notificationEnabled,
        // 無効で保存する場合もHomeScreenの一覧上のトグルと同じ方針で、
        // NONE_REMINDER_VALUEで上書きせず元のタイミングを残す。
        notificationMinutesBefore: reminder.getPersistableMinutesBefore(),
        priority,
        tagIds,
        // 隔週/毎月/N日ごとを設定した場合、以前の曜日繰り返し(weekdays)を明示的に
        // 解除する。AddTaskScreenの新規作成時と同様、両方の繰り返し機構が同時に
        // 残っているとカレンダー表示・通知・カレンダー同期側は曜日指定を優先して
        // しまい、新しい繰り返し設定が反映されない。
        weekdays: recurrence ? null : undefined,
        recurrence,
      });
      onClose();
      await onSaved();
    } catch {
      Alert.alert("エラー", "タスクの更新に失敗しました");
    }
  };

  // iOS: mode="datetime" の spinner は宣言的な<DateTimePicker>のままで問題ないため据え置き。
  // 操作中に onChange が連続発火するため、自動では閉じず既存の「閉じる」ボタンに任せる。
  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (!selectedDate || !showDatePicker) return;

    if (showDatePicker === "start") {
      setStartDate(selectedDate);
    } else {
      setEndDate(selectedDate);
    }
  };

  // Android: 宣言的な<DateTimePicker>をこの編集モーダル(RNのModalコンポーネント)の中に
  // マウントすると、Modal自体が別ウィンドウのDialogとして描画されるAndroid上で、
  // ネイティブのDatePickerDialog(FragmentベースでActivityのFragmentManagerを使う)と
  // 競合してクラッシュすることがある。また"datetime"はAndroidでは無効なmodeで、
  // 実際には日付のみのダイアログに縮退してしまい時刻編集ができていなかった。
  // そのためAndroidだけは、Viewツリーに一切コンポーネントをマウントしない命令的API
  // (DateTimePickerAndroid.open)を使い、日付→時刻の順に2段階でダイアログを出す。
  const openAndroidDateTimePicker = (field: "start" | "end") => {
    const base = (field === "start" ? startDate : endDate) ?? new Date();

    DateTimePickerAndroid.open({
      value: base,
      mode: "date",
      onChange: (dateEvent, selectedDate) => {
        if (dateEvent.type !== "set" || !selectedDate) return;
        const mergedDate = mergeDatePart(base, selectedDate);

        DateTimePickerAndroid.open({
          value: mergedDate,
          mode: "time",
          is24Hour: true,
          onChange: (timeEvent, selectedTime) => {
            if (timeEvent.type !== "set" || !selectedTime) return;
            const finalDate = mergeTimePart(mergedDate, selectedTime);

            if (field === "start") {
              setStartDate(finalDate);
            } else {
              setEndDate(finalDate);
            }
          },
        });
      },
    });
  };

  const openDateTimePicker = (field: "start" | "end") => {
    if (Platform.OS === "android") {
      openAndroidDateTimePicker(field);
    } else {
      setShowDatePicker(field);
    }
  };

  return (
    <Modal visible={item !== null} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>タスクを編集</Text>
          <TextInput
            style={[styles.modalInput, styles.modalTextArea]}
            value={text}
            onChangeText={setText}
            placeholder="内容"
            multiline={true}
            textAlignVertical="top"
          />
          <View style={styles.dateRow}>
            <View style={styles.dateColumn}>
              <Text style={styles.fieldLabel}>開始日時</Text>
              <TouchableOpacity
                style={styles.dateSelectorButton}
                onPress={() => openDateTimePicker("start")}
              >
                <Text style={styles.dateSelectorButtonText}>
                  {startDate ? formatItemDateTime(startDate.toISOString()) : "未設定"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateColumn}>
              <Text style={styles.fieldLabel}>終了日時</Text>
              <TouchableOpacity
                style={styles.dateSelectorButton}
                onPress={() => openDateTimePicker("end")}
              >
                <Text style={styles.dateSelectorButtonText}>
                  {endDate ? formatItemDateTime(endDate.toISOString()) : "未設定"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.fieldLabel}>優先度</Text>
          <PriorityButtonGroup value={priority} onChange={setPriority} />
          <Text style={styles.fieldLabel}>タグ</Text>
          <TagEditor
            allTags={tags}
            selectedTagIds={tagIds}
            onToggleTag={toggleTag}
            onCreateTag={addNewTag}
          />
          <Text style={styles.fieldLabel}>繰り返し</Text>
          <RecurrenceEditor value={recurrence} onChange={setRecurrence} />
          {Platform.OS === "ios" && showDatePicker && (
            <View style={styles.datePickerPanel}>
              <DateTimePicker
                value={showDatePicker === "start" ? startDate ?? new Date() : endDate ?? new Date()}
                mode="datetime"
                is24Hour={true}
                display="spinner"
                onChange={handleDateChange}
                locale="ja-JP"
              />
              <TouchableOpacity
                style={styles.datePickerCloseButton}
                onPress={() => setShowDatePicker(null)}
              >
                <Text style={styles.datePickerCloseButtonText}>閉じる</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.notificationRow}>
            <TouchableOpacity
              onPress={reminder.toggleReminderEnabled}
              accessibilityRole="switch"
              accessibilityLabel="通知タイミング"
              accessibilityState={{ checked: reminder.notificationEnabled }}
            >
              <Ionicons
                name={reminder.notificationEnabled ? "notifications-outline" : "notifications-off-outline"}
                size={18}
                color={reminder.notificationEnabled ? NOTIFICATION_ENABLED_COLOR : colors.textSecondary}
              />
            </TouchableOpacity>
            <View style={styles.notificationDropdown}>
              <SelectModal
                options={REMINDER_SELECT_OPTIONS}
                selectedValue={reminder.notificationMinutesBefore.toString()}
                selectedLabel={reminder.selectedReminderLabel}
                isOpen={reminder.isReminderListOpen}
                disabled={!reminder.notificationEnabled}
                accessibilityLabel="通知タイミングを選択"
                onToggle={() => reminder.setIsReminderListOpen((current) => !current)}
                onClose={() => reminder.setIsReminderListOpen(false)}
                onSelect={(value) => reminder.selectReminderMinutes(Number(value))}
              />
            </View>
          </View>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={onClose}
            >
              <Text style={[styles.modalButtonText, modalStyles.modalButtonCancelText]}>
                キャンセル
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSubmit]}
              onPress={() => {
                void handleSave();
              }}
            >
              <Text style={styles.modalButtonText}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
