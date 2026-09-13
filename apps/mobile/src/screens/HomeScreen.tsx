import { CompletionCheckbox, completionStyles } from "../components/CompletionCheckbox";
import { useItemCompletions } from "../hooks/useItemCompletions";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../styles/tokens";
import { styles } from "../styles/screens/HomeScreen.styles";
import { modalStyles } from "../styles/modalStyles";
import { useFocusEffect, type CompositeScreenProps } from "@react-navigation/native";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import Swipeable from "react-native-gesture-handler/Swipeable";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { resolveReminderMinutesToRestore, type Category, type SavedItem } from "@milkbox/shared";
import type { RootStackParamList, RootTabParamList } from "../navigation/types";
import { UNCATEGORIZED_KEY } from "../utils/scheduleGrouping";
import { CategorySection, groupByCategory } from "../utils/groupByCategory";
import { SelectModal } from "../components/SelectModal";
import { useDatabaseManager } from "../contexts/DatabaseContext";
import { formatWeekdayLabels, parseWeekdays } from "../utils/weekdays";
import { isEndDateBeforeStartDate } from "../utils/dateValidation";
import { parseItemDate, startOfDay } from "../utils/calendarDates";
import { DEFAULT_COLORS } from "../constants/colors";
import { mergeDatePart, mergeTimePart } from "../hooks/useDatePicker";
import { REMINDER_SELECT_OPTIONS, useReminderPicker } from "../hooks/useReminderPicker";

type Props = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, "Home">,
  NativeStackScreenProps<RootStackParamList>
>;

// ベルアイコンで示す「通知タイミング」欄の有効時の色。#333は他の暗めの本文色
// (dateSelectorButtonTextなど)と同じくFigma上のraw hexで、textPrimary(黒)/
// textSecondary(#666)どちらのトークンとも一致しないためそのまま踏襲している。
const NOTIFICATION_ENABLED_COLOR = "#333";

// utils/calendarDates.ts の parseItemDate/parsePointDate と似ているが別物。
// あちらは「時刻を落として日付だけにする」「日付のみの文字列は9時扱いにする」
// といったカレンダー表示向けの正規化を行うのに対し、ここはサブタスク編集
// フォームの初期値としてstartDate/endDateをそのままDateへ変換したいだけ
// (時刻も保持する)ため、意図的に正規化していない。
const parseOptionalDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatCategoryWeekdays = (section: CategorySection, category?: Category): string | null => {
  const categoryLabels = formatWeekdayLabels(category?.weekdays);
  if (categoryLabels) return categoryLabels;

  const weekdays = new Set<number>();

  for (const item of section.data) {
    for (const weekday of parseWeekdays(item.weekdays)) {
      weekdays.add(weekday);
    }
  }

  return formatWeekdayLabels(
    JSON.stringify([...weekdays].sort((left, right) => left - right)),
  );
};

const HomeScreen = ({ navigation }: Props) => {
  const [sections, setSections] = useState<CategorySection[]>([]);
  const [collapsedSectionKeys, setCollapsedSectionKeys] = useState<Set<string>>(() => new Set());
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<SavedItem | null>(null);
  const [editItemText, setEditItemText] = useState("");
  const [editItemStartDate, setEditItemStartDate] = useState<Date | null>(null);
  const [editItemEndDate, setEditItemEndDate] = useState<Date | null>(null);
  const [showItemDatePicker, setShowItemDatePicker] = useState<
    "start" | "end" | null
  >(null);
  const itemReminder = useReminderPicker();
  const [togglingNotificationItemId, setTogglingNotificationItemId] = useState<number | null>(null);
  const togglingNotificationRef = useRef(false);
  const { dbManager, notificationsEnabled } = useDatabaseManager();
  const completions = useItemCompletions();

  const loadItems = useCallback(async () => {
    // 通知トグルの楽観的更新(handleToggleItemNotification)がDB書き込み中に、
    // 別要因(画面フォーカス復帰など)でのloadItems()が書き込み前の古い状態を
    // 読み込んで上書きしてしまうのを防ぐ。書き込みが終わればtogglingNotificationRef
    // がfalseに戻るので、その後の再読み込みは通常通り最新状態を反映できる。
    if (togglingNotificationRef.current) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      const [result, categoryResult] = await Promise.all([
        dbManager.itemRepository.findAllWithCategory(),
        dbManager.categoryRepository.findAll(),
      ]);
      const grouped = groupByCategory(result);

      setSections(grouped);
      setCategories(categoryResult);
    } catch {
      setErrorMessage("タスクの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [dbManager]);

  useFocusEffect(
    useCallback(() => {
      void loadItems();
    }, [loadItems])
  );

  const handleNavigateAddTask = () => {
    navigation.navigate("AddTask");
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await dbManager.deleteItem(id);
      await loadItems();
    } catch {
      Alert.alert("エラー", "タスクの削除に失敗しました");
    }
  };

  const handleToggleItemNotification = async (item: SavedItem) => {
    if (togglingNotificationRef.current) return;
    togglingNotificationRef.current = true;

    const enabled = !item.notificationEnabled;
    // 無効化する時はnotificationMinutesBeforeをNONE_REMINDER_VALUEで
    // 上書きしない(=元々設定していたタイミングをDBに残す)。そうしないと
    // 再度有効化した際に元の値へ戻せず、常にDEFAULT_REMINDER_MINUTESへ
    // リセットされてしまう。有効化する時だけ、その保持された値
    // (一度も設定したことがなければDEFAULT_REMINDER_MINUTES)を使う。
    const notificationMinutesBefore = enabled
      ? resolveReminderMinutesToRestore(item.notificationMinutesBefore)
      : item.notificationMinutesBefore;

    // loadItems()での全件再取得はsetLoading(true)経由でリスト全体を
    // ActivityIndicatorに差し替えてしまい、タップのたびに画面がチラつく
    // 原因になっていた。結果はここで分かっているので、DB更新はしつつ
    // 画面側はローカルstateだけを直接書き換える(楽観的更新)。
    // 失敗時のみloadItems()で正しい状態に戻す。
    // 対象アイテムを含むセクションだけを新しいオブジェクトにし、無関係な
    // セクションの参照はそのまま残すことでSectionListの再描画を最小限にする。
    setSections((current) =>
      current.map((section) => {
        if (!section.data.some((sectionItem) => sectionItem.id === item.id)) {
          return section;
        }

        return {
          ...section,
          data: section.data.map((sectionItem) =>
            sectionItem.id === item.id
              ? { ...sectionItem, notificationEnabled: enabled, notificationMinutesBefore }
              : sectionItem
          ),
        };
      }),
    );

    try {
      setTogglingNotificationItemId(item.id);
      await dbManager.updateItem(item.id, {
        notificationEnabled: enabled,
        // 無効化時は上のnotificationMinutesBefore計算により現状の値を
        // そのまま送るだけで、実質DBの値は変わらない(意図的に据え置き)。
        notificationMinutesBefore,
      });
    } catch {
      Alert.alert("エラー", "通知設定の更新に失敗しました");
      await loadItems();
    } finally {
      togglingNotificationRef.current = false;
      setTogglingNotificationItemId(null);
    }
  };

  const openItemEditor = (item: SavedItem) => {
    setEditingItem(item);
    setEditItemText(item.text);
    setEditItemStartDate(parseOptionalDate(item.startDate));
    setEditItemEndDate(parseOptionalDate(item.endDate));
    setShowItemDatePicker(null);
    // 一覧のベルアイコン(handleToggleItemNotification)は無効化しても
    // notificationMinutesBeforeを上書きしないため、現在は無効でも実際の値が
    // 残っていることがある。useReminderPicker側もnotificationEnabledではなく
    // notificationMinutesBefore自体を見て復元用の値を決める。
    itemReminder.resetReminder(item.notificationMinutesBefore, item.notificationEnabled);
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    const trimmedText = editItemText.trim();
    if (!trimmedText) {
      Alert.alert("エラー", "内容を入力してください");
      return;
    }

    if (isEndDateBeforeStartDate(editItemStartDate, editItemEndDate)) {
      Alert.alert("エラー", "終了日時が開始日時より前です。終了日時を再設定してください。");
      return;
    }

    try {
      await dbManager.updateItem(editingItem.id, {
        text: trimmedText,
        startDate: editItemStartDate?.toISOString() ?? null,
        endDate: editItemEndDate?.toISOString() ?? null,
        notificationEnabled: itemReminder.notificationEnabled,
        // 無効で保存する場合もhandleToggleItemNotificationと同じ方針で、
        // NONE_REMINDER_VALUEで上書きせず元のタイミングを残す。
        notificationMinutesBefore: itemReminder.getPersistableMinutesBefore(),
      });
      setEditingItem(null);
      await loadItems();
    } catch {
      Alert.alert("エラー", "サブタスクの更新に失敗しました");
    }
  };

  // iOS: mode="datetime" の spinner は宣言的な<DateTimePicker>のままで問題ないため据え置き。
  // 操作中に onChange が連続発火するため、自動では閉じず既存の「閉じる」ボタンに任せる。
  const handleItemDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (!selectedDate || !showItemDatePicker) return;

    if (showItemDatePicker === "start") {
      setEditItemStartDate(selectedDate);
    } else {
      setEditItemEndDate(selectedDate);
    }
  };

  // Android: 宣言的な<DateTimePicker>をこの編集モーダル(RNのModalコンポーネント)の中に
  // マウントすると、Modal自体が別ウィンドウのDialogとして描画されるAndroid上で、
  // ネイティブのDatePickerDialog(FragmentベースでActivityのFragmentManagerを使う)と
  // 競合してクラッシュすることがある。また"datetime"はAndroidでは無効なmodeで、
  // 実際には日付のみのダイアログに縮退してしまい時刻編集ができていなかった。
  // そのためAndroidだけは、Viewツリーに一切コンポーネントをマウントしない命令的API
  // (DateTimePickerAndroid.open)を使い、日付→時刻の順に2段階でダイアログを出す。
  const openAndroidItemDateTimePicker = (field: "start" | "end") => {
    const base = (field === "start" ? editItemStartDate : editItemEndDate) ?? new Date();

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
              setEditItemStartDate(finalDate);
            } else {
              setEditItemEndDate(finalDate);
            }
          },
        });
      },
    });
  };

  const openItemDateTimePicker = (field: "start" | "end") => {
    if (Platform.OS === "android") {
      openAndroidItemDateTimePicker(field);
    } else {
      setShowItemDatePicker(field);
    }
  };

  const renderRightActions = (id: number) => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => {
        void handleDeleteItem(id);
      }}
      activeOpacity={0.8}
    >
      <Text style={styles.deleteActionText}>削除</Text>
    </TouchableOpacity>
  );

  const formatItemDateTime = (value?: string, timeOnly = false) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    if (timeOnly) return `${hour}:${minute}`;
    return `${year}.${month}.${day} ${hour}:${minute}`;
  };

  // カテゴリ付きタスクはAddTaskScreen側の登録時、日付部分が常に「今日」で
  // 埋まる(曜日+時刻の繰り返しが本体で、日付自体に意味がないため)。一方
  // HomeScreenの編集モーダルはカテゴリの有無を問わず任意の日付を設定できるので、
  // 開始/終了のどちらかが「今日」以外の日付になっていれば、それはユーザーが
  // 意図的に設定した実際の日付とみなして表示する。
  const hasMeaningfulDate = (value?: string) => {
    const parsed = value ? parseItemDate(value) : null;
    return parsed !== null && parsed.getTime() !== startOfDay(new Date()).getTime();
  };

  const formatItemDateTimeRange = (item: Pick<SavedItem, "startDate" | "endDate" | "categoryId">) => {
    const timeOnly =
      item.categoryId != null && !hasMeaningfulDate(item.startDate) && !hasMeaningfulDate(item.endDate);
    if (item.startDate && item.endDate) {
      return `${formatItemDateTime(item.startDate, timeOnly)} ～ ${formatItemDateTime(item.endDate, timeOnly)}`;
    }
    if (item.startDate) {
      return `${formatItemDateTime(item.startDate, timeOnly)} ～`;
    }
    if (item.endDate) {
      return `～ ${formatItemDateTime(item.endDate, timeOnly)}`;
    }
    return null;
  };

  const hasDateRange = (item: { startDate?: string; endDate?: string }) =>
    Boolean(item.startDate || item.endDate);

  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const visibleSections = useMemo(() => sections.map((section) => {
    const categoryId = section.data[0]?.categoryId;
    const key = categoryId != null ? String(categoryId) : UNCATEGORIZED_KEY;
    const category = categories.find((candidate) => candidate.id === categoryId);
    const collapsed = collapsedSectionKeys.has(key);
    // 閉じてもカテゴリ情報と曜日表示を失わないよう、元のdataからメタデータを保持する。
    return {
      ...section,
      key,
      categoryId,
      weekdayLabels: formatCategoryWeekdays(section, category),
      collapsed,
      data: collapsed ? [] : section.data,
    };
  }), [sections, categories, collapsedSectionKeys]);

  const toggleSection = (key: string) => {
    setCollapsedSectionKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };


  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Modal
        visible={editingItem !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditingItem(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>サブタスクを編集</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={editItemText}
              onChangeText={setEditItemText}
              placeholder="内容"
              multiline={true}
              textAlignVertical="top"
            />
            <View style={styles.dateRow}>
              <View style={styles.dateColumn}>
                <Text style={styles.fieldLabel}>開始日時</Text>
                <TouchableOpacity
                  style={styles.dateSelectorButton}
                  onPress={() => openItemDateTimePicker("start")}
                >
                  <Text style={styles.dateSelectorButtonText}>
                    {editItemStartDate ? formatItemDateTime(editItemStartDate.toISOString()) : "未設定"}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.dateColumn}>
                <Text style={styles.fieldLabel}>終了日時</Text>
                <TouchableOpacity
                  style={styles.dateSelectorButton}
                  onPress={() => openItemDateTimePicker("end")}
                >
                  <Text style={styles.dateSelectorButtonText}>
                    {editItemEndDate ? formatItemDateTime(editItemEndDate.toISOString()) : "未設定"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            {Platform.OS === "ios" && showItemDatePicker && (
              <View style={styles.datePickerPanel}>
                <DateTimePicker
                  value={
                    showItemDatePicker === "start"
                      ? editItemStartDate ?? new Date()
                      : editItemEndDate ?? new Date()
                  }
                  mode="datetime"
                  is24Hour={true}
                  display="spinner"
                  onChange={handleItemDateChange}
                  locale="ja-JP"
                />
                <TouchableOpacity
                  style={styles.datePickerCloseButton}
                  onPress={() => setShowItemDatePicker(null)}
                >
                  <Text style={styles.datePickerCloseButtonText}>閉じる</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.notificationRow}>
              <TouchableOpacity
                onPress={itemReminder.toggleReminderEnabled}
                accessibilityRole="switch"
                accessibilityLabel="通知タイミング"
                accessibilityState={{ checked: itemReminder.notificationEnabled }}
              >
                <Ionicons
                  name={itemReminder.notificationEnabled ? "notifications-outline" : "notifications-off-outline"}
                  size={18}
                  color={itemReminder.notificationEnabled ? NOTIFICATION_ENABLED_COLOR : colors.textSecondary}
                />
              </TouchableOpacity>
              <View style={styles.notificationDropdown}>
                <SelectModal
                  options={REMINDER_SELECT_OPTIONS}
                  selectedValue={itemReminder.notificationMinutesBefore.toString()}
                  selectedLabel={itemReminder.selectedReminderLabel}
                  isOpen={itemReminder.isReminderListOpen}
                  disabled={!itemReminder.notificationEnabled}
                  accessibilityLabel="通知タイミングを選択"
                  onToggle={() => itemReminder.setIsReminderListOpen((current) => !current)}
                  onClose={() => itemReminder.setIsReminderListOpen(false)}
                  onSelect={(value) => itemReminder.selectReminderMinutes(Number(value))}
                />
              </View>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setEditingItem(null)}
              >
                <Text style={[styles.modalButtonText, modalStyles.modalButtonCancelText]}>
                  キャンセル
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={() => {
                  void handleUpdateItem();
                }}
              >
                <Text style={styles.modalButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.title}>タスク</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.addTaskButton} onPress={handleNavigateAddTask}>
            <Text style={styles.addTaskButtonText}>追加</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate("Settings")}
            accessibilityLabel="設定"
          >
            <Ionicons name="settings-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {!notificationsEnabled && (
        <View style={styles.notificationWarning}>
          <Text style={styles.notificationWarningText}>
            通知が許可されていません。端末の設定からMilkboxの通知を有効にしてください。
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : errorMessage ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{errorMessage}</Text>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>タスクはまだありません</Text>
        </View>
      ) : (
        <SectionList
          sections={visibleSections}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => {
            const category = section.categoryId != null ? categoryById.get(section.categoryId) : undefined;
            const weekdayLabels = section.weekdayLabels;
            // Figmaの更新で、タスク単位の色ドットではなくカテゴリ単位で1つだけ
            // ヘッダーに表示する形になった。指定なし(未分類)セクションは特定の
            // カテゴリ色を持たないため、中間グレー(colors.tabInactive)を使う。
            const sectionColor = category ? category.color : colors.tabInactive;
            const headerContent = (
              <>
                <View style={styles.sectionCategoryLabel}>
                  <View style={[styles.sectionColorIndicator, { backgroundColor: sectionColor }]} />
                  <Text style={styles.sectionHeaderText}>{section.title}</Text>
                </View>
                {weekdayLabels ? (
                  <Text style={styles.sectionWeekdays}>{weekdayLabels}</Text>
                ) : null}
              </>
            );

            return (
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(section.key)}
                accessibilityRole="button"
                accessibilityLabel={`${section.title}を${section.collapsed ? "展開" : "折りたたむ"}`}
                accessibilityState={{ expanded: !section.collapsed }}
                activeOpacity={0.8}
              >
                <View style={styles.sectionHeaderContent}>{headerContent}</View>
                <View style={styles.sectionToggle}>
                  <Ionicons
                    name={section.collapsed ? "chevron-down" : "chevron-up"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>
            );
          }}
          // renderItemはメモ化していないインラインの関数なので、completionsが更新されて
          // HomeScreenが再レンダーされるたびに新しい関数として渡され、SectionListの各セルは
          // それだけで再描画される(=extraDataは不要)。もしrenderItemをuseCallbackで
          // メモ化するようになったら、completionsの更新をセルへ伝えるためにextraDataの
          // 指定を復活させること。
          renderItem={({ item }) => {
            const dateTimeRange = formatItemDateTimeRange(item);

            return (
              <Swipeable renderRightActions={() => renderRightActions(item.id)}>
                <View style={styles.itemContainer}>
                  <CompletionCheckbox
                    text={item.text}
                    completed={completions.completedIds.has(item.id)}
                    disabled={completions.disabled}
                    onPress={() => void completions.toggleCompletion(item.id)}
                  />
                  <TouchableOpacity
                    style={styles.itemEditButton}
                    onPress={() => openItemEditor(item)}
                    // このアイテムの通知トグルがDB書き込み中は、開いた編集モーダルの
                    // 保存で書き込み中の値を再送してしまい、失敗時のロールバックを
                    // 無効化しかねないため、その間だけ編集を開けないようにする。
                    disabled={togglingNotificationItemId === item.id}
                    activeOpacity={0.8}
                  >
                    <View style={styles.itemMainRow}>
                      {/* カテゴリ付きタスクは色をセクションヘッダー側に1つだけ表示するため、
                          タスク行ではドットを出さない。未分類タスクだけタスクごとの色を残す。 */}
                      {item.categoryId == null ? (
                        <View
                          style={[
                            styles.itemColorIndicator,
                            { backgroundColor: item.color || DEFAULT_COLORS.task },
                          ]}
                        />
                      ) : null}
                      <Text style={[styles.itemText, completions.completedIds.has(item.id) && completionStyles.completedText]}>{item.text}</Text>
                      {hasDateRange(item) && dateTimeRange ? (
                        <Text style={styles.itemDateSummary}>{dateTimeRange}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.notificationToggle}
                    onPress={() => void handleToggleItemNotification(item)}
                    disabled={togglingNotificationItemId !== null}
                    accessibilityRole="switch"
                    accessibilityLabel={`${item.text}の通知`}
                    accessibilityState={{
                      checked: item.notificationEnabled,
                      disabled: togglingNotificationItemId !== null,
                    }}
                  >
                    <Ionicons
                      name={item.notificationEnabled ? "notifications-outline" : "notifications-off-outline"}
                      size={18}
                      color={item.notificationEnabled ? NOTIFICATION_ENABLED_COLOR : colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </Swipeable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

export default HomeScreen;
