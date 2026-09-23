import { CompletionStatsCard } from "../components/CompletionStatsCard";
import { countCategoryOccurrences } from "../utils/completionStats";
import { buildWeek, createDateKey, getSundayOnOrBefore } from "../utils/calendarDates";
import { CategorySignatureIcon } from "../components/CategorySignature";
import { CompletionCheckbox, completionStyles } from "../components/CompletionCheckbox";
import { UndoSnackbar } from "../components/UndoSnackbar";
import { useItemCompletions } from "../hooks/useItemCompletions";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../styles/tokens";
import { styles } from "../styles/screens/HomeScreen.styles";
import { useFocusEffect, type CompositeScreenProps } from "@react-navigation/native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { PRIORITY_OPTIONS, resolveReminderMinutesToRestore, type Category, type Priority, type SavedItem, type Tag } from "@milkbox/shared";
import type { RootStackParamList, RootTabParamList } from "../navigation/types";
import { UNCATEGORIZED_KEY } from "../utils/scheduleGrouping";
import { CategorySection, groupByCategory } from "../utils/groupByCategory";
import { SelectModal } from "../components/SelectModal";
import { useDatabaseManager } from "../contexts/DatabaseContext";
import { formatWeekdayLabels, parseWeekdays } from "../utils/weekdays";
import { parseItemDate, startOfDay } from "../utils/calendarDates";
import { DEFAULT_COLORS, PRIORITY_COLORS } from "../constants/colors";
import { EditItemModal } from "../components/EditItemModal";
import { formatRecurrenceLabel } from "../utils/recurrence";

type Props = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, "Home">,
  NativeStackScreenProps<RootStackParamList>
>;

type SortOrder = "default" | "priority" | "name";

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "default", label: "追加順" },
  { value: "priority", label: "優先度順" },
  { value: "name", label: "名前順" },
];

// PRIORITY_OPTIONSは高→中→低の順で定義されているため、その並びをそのまま
// 比較用の順位に変換する(優先度の値自体は増減の意味を持たない文字列のため)。
const PRIORITY_RANK: Record<Priority, number> = Object.fromEntries(
  PRIORITY_OPTIONS.map((option, index) => [option.value, index]),
) as Record<Priority, number>;

// ベルアイコンで示す「通知タイミング」欄の有効時の色。#333は他の暗めの本文色
// (dateSelectorButtonTextなど)と同じくFigma上のraw hexで、textPrimary(黒)/
// textSecondary(#666)どちらのトークンとも一致しないためそのまま踏襲している。
const NOTIFICATION_ENABLED_COLOR = "#333";

// スワイプ削除後、実際にDBから消すまでUndoできる猶予時間。
const DELETE_UNDO_TIMEOUT_MS = 5000;

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
  const [togglingNotificationItemId, setTogglingNotificationItemId] = useState<number | null>(null);
  const togglingNotificationRef = useRef(false);
  const { dbManager, notificationsEnabled } = useDatabaseManager();
  const completions = useItemCompletions();
  // スワイプ削除の対象。DBからは即座に消さず、この猶予期間だけ一覧から隠して
  // Undoできるようにする(visibleSectionsで実際のフィルタを行う)。
  const [pendingDelete, setPendingDelete] = useState<SavedItem | null>(null);
  const pendingDeleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("default");
  const [isSortListOpen, setIsSortListOpen] = useState(false);

  const loadItems = useCallback(async () => {
    // 通知トグルの楽観的更新(handleToggleItemNotification)がDB書き込み中に、
    // 別要因(画面フォーカス復帰など)でのloadItems()が書き込み前の古い状態を
    // 読み込んで上書きしてしまうのを防ぐ。書き込みが終わればtogglingNotificationRef
    // がfalseに戻るので、その後の再読み込みは通常通り最新状態を反映できる。
    if (togglingNotificationRef.current) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      const [result, categoryResult, itemTags] = await Promise.all([
        dbManager.itemRepository.findAllWithCategory(),
        dbManager.categoryRepository.findAll(),
        dbManager.tagRepository.findAllItemTags(),
      ]);
      const tagsByItemId = new Map<number, Tag[]>();
      for (const { itemId, tag } of itemTags) {
        const existing = tagsByItemId.get(itemId);
        if (existing) {
          existing.push(tag);
        } else {
          tagsByItemId.set(itemId, [tag]);
        }
      }
      const withTags = result.map((item) => ({ ...item, tags: tagsByItemId.get(item.id) ?? [] }));
      const grouped = groupByCategory(withTags);

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

  // buildWeek(...)[0]だけが欲しいだけなのに7日分のDate配列を毎レンダー組み立てる
  // 無駄を避けるため、週の起点(日曜日)だけを直接計算するgetSundayOnOrBeforeを使う。
  const weekKey = createDateKey(getSundayOnOrBefore(startOfDay(new Date())));
  const week = useMemo(() => buildWeek(new Date(`${weekKey}T00:00:00`)), [weekKey]);
  const [weeklyCompleted, setWeeklyCompleted] = useState<number | null>(null);
  const [weeklyError, setWeeklyError] = useState(false);
  // 表示中の週が変わった時だけ「読み込み中」に戻す。completions.completedIds
  // (今日のタスクの完了チェック)の変化では再取得はしつつも、値が来るまで
  // 前回の数値を出したままにしてチラつきを防ぐ。
  const loadedWeekKeyRef = useRef<string | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    if (loadedWeekKeyRef.current !== weekKey) {
      loadedWeekKeyRef.current = weekKey;
      setWeeklyCompleted(null);
    }
    setWeeklyError(false);
    void dbManager.itemRepository.findCompletionsInRange(createDateKey(week[0]), createDateKey(week[6]))
      .then(rows => { if (active) setWeeklyCompleted(rows.length); })
      .catch(() => { if (active) setWeeklyError(true); });
    return () => { active = false; };
    // sectionsは通知トグル・削除など完了件数と無関係な更新でも変わるため、依存に
    // 含めない(含めると無関係な操作のたびに読み込み中フラッシュ+再クエリが走る)。
    // completions.disabled(今日ぶんの完了取得の busy/エラー状態)もここでは見ない:
    // 週間の集計は日次のuseItemCompletionsとは独立したクエリなので、日次側が
    // エラー/読み込み中のままでも週間の取得は妨げない。
  }, [dbManager, week, weekKey, completions.completedIds]));
  const weeklyGroups = useMemo(() => countCategoryOccurrences(
    sections.flatMap(section => section.data), categories, week,
  ), [sections, categories, week]);

  const handleNavigateAddTask = () => {
    navigation.navigate("AddTask");
  };

  // Undoされなかった保留中削除を実際にDBへ反映する。失敗時は一覧を再読み込みして
  // (隠されたままになっていた)アイテムを正しい状態に戻す。
  const finalizeDelete = useCallback(async (item: SavedItem) => {
    try {
      await dbManager.deleteItem(item.id);
      // 削除確定後はpendingDeleteによる一時的な非表示フィルタが外れる(タイマー発火時に
      // pendingDeleteをnullにする、または次の削除でpendingDeleteが別アイテムに切り替わる)
      // ため、実データ(sections)側からもここで取り除く。取り除かないと確定削除された
      // アイテムが一覧に復活して見えてしまう。
      setSections((current) =>
        current
          .map((section) => ({
            ...section,
            data: section.data.filter((sectionItem) => sectionItem.id !== item.id),
          }))
          .filter((section) => section.data.length > 0),
      );
    } catch {
      Alert.alert("エラー", "タスクの削除に失敗しました");
      await loadItems();
    }
  }, [dbManager, loadItems]);

  const clearPendingDeleteTimer = () => {
    if (pendingDeleteTimerRef.current) {
      clearTimeout(pendingDeleteTimerRef.current);
      pendingDeleteTimerRef.current = null;
    }
  };

  // スナックバーは常に直近1件だけを表示する単純な設計。既に保留中の削除がある状態で
  // 別のアイテムを削除した場合、前のものは猶予を待たずにすぐ確定させる。
  const requestDeleteItem = (item: SavedItem) => {
    const previous = pendingDelete;
    clearPendingDeleteTimer();
    setPendingDelete(item);
    pendingDeleteTimerRef.current = setTimeout(() => {
      pendingDeleteTimerRef.current = null;
      setPendingDelete((current) => (current?.id === item.id ? null : current));
      void finalizeDelete(item);
    }, DELETE_UNDO_TIMEOUT_MS);

    if (previous && previous.id !== item.id) {
      void finalizeDelete(previous);
    }
  };

  const handleUndoDelete = () => {
    clearPendingDeleteTimer();
    setPendingDelete(null);
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
  };

  const renderRightActions = (item: SavedItem) => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => requestDeleteItem(item)}
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

  const isSearching = searchQuery.trim().length > 0;

  const sortItems = (items: SavedItem[]): SavedItem[] => {
    if (sortOrder === "default") return items;
    const sorted = [...items];
    if (sortOrder === "priority") {
      sorted.sort((left, right) => PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority]);
    } else {
      sorted.sort((left, right) => left.text.localeCompare(right.text, "ja"));
    }
    return sorted;
  };

  const visibleSections = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matchesSearch = (item: SavedItem) => {
      if (!isSearching) return true;
      if (item.text.toLowerCase().includes(normalizedQuery)) return true;
      return (item.tags ?? []).some((tag) => tag.name.toLowerCase().includes(normalizedQuery));
    };

    return sections
      .map((section) => {
        const categoryId = section.data[0]?.categoryId;
        const key = categoryId != null ? String(categoryId) : UNCATEGORIZED_KEY;
        const category = categories.find((candidate) => candidate.id === categoryId);
        // 検索中は、絞り込んだ結果を見せるためセクションの折りたたみを無視する
        // (閉じたセクションの中に検索対象があっても見えなくなってしまうため)。
        const collapsed = collapsedSectionKeys.has(key) && !isSearching;
        // 閉じてもカテゴリ情報と曜日表示を失わないよう、元のdataからメタデータを保持する。
        // 保留中削除のアイテムはUndo猶予の間、実データ(sections)には残したまま
        // 表示だけ隠す。loadItems()がフォーカス復帰等で再実行されて元データが
        // 更新されても、pendingDeleteが残っていれば引き続き非表示にできる。
        const filtered = section.data
          .filter((item) => (pendingDelete ? item.id !== pendingDelete.id : true))
          .filter(matchesSearch);
        const data = collapsed ? [] : sortItems(filtered);
        return {
          ...section,
          key,
          categoryId,
          weekdayLabels: formatCategoryWeekdays(section, category),
          collapsed,
          data,
        };
      })
      // 検索中、該当する予定が1件も無いカテゴリのヘッダーごと隠す。
      .filter((section) => !isSearching || section.data.length > 0);
    // sortItems/matchesSearchはコンポーネント直下で毎レンダー再生成される関数だが、
    // 実体はsortOrder/isSearching/searchQueryにしか依存しないため、依存配列には
    // それらの値だけを列挙する(関数そのものを依存に含めると無限に再計算される)。
  }, [sections, categories, collapsedSectionKeys, pendingDelete, isSearching, searchQuery, sortOrder]);

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
      <EditItemModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSaved={loadItems}
      />

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

      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="タスクやタグを検索"
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              accessibilityRole="button"
              accessibilityLabel="検索をクリア"
            >
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <SelectModal
          options={SORT_OPTIONS}
          selectedValue={sortOrder}
          selectedLabel={SORT_OPTIONS.find((option) => option.value === sortOrder)?.label ?? ""}
          isOpen={isSortListOpen}
          accessibilityLabel="並び替え"
          onToggle={() => setIsSortListOpen((current) => !current)}
          onClose={() => setIsSortListOpen(false)}
          onSelect={(value) => {
            setSortOrder(value as SortOrder);
            setIsSortListOpen(false);
          }}
        />
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
      ) : (
        <SectionList
          ListHeaderComponent={<CompletionStatsCard title="週の振り返り" completed={weeklyCompleted} error={weeklyError} groups={weeklyGroups} showCounts />}
          ListEmptyComponent={<Text style={styles.stateText}>タスクはまだありません</Text>}
          sections={visibleSections}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => {
            const category = section.categoryId != null ? categoryById.get(section.categoryId) : undefined;
            const weekdayLabels = section.weekdayLabels;
            // Figmaの更新で、タスク単位の色ドットではなくカテゴリ単位で1つだけ
            // ヘッダーに表示する形になった。指定なし(未分類)セクションは特定の
            // カテゴリ色を持たないため、中間グレー(colors.tabInactive)を使う。
            const headerContent = (
              <>
                <View style={styles.sectionCategoryLabel}>
                  <CategorySignatureIcon category={category} />
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
              <Swipeable renderRightActions={() => renderRightActions(item)}>
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
                          タスク行では表示しない。未分類タスクはAddTaskScreenのタスクの色
                          ピッカーで選んだitem.colorをそのまま使う(カテゴリのシグネチャーは
                          持たないため)。 */}
                      {item.categoryId == null ? (
                        <CategorySignatureIcon
                          size={20}
                          category={{ color: item.color || DEFAULT_COLORS.task }}
                        />
                      ) : null}
                      <View
                        style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[item.priority] }]}
                        accessibilityLabel={`優先度: ${item.priority}`}
                      />
                      <Text style={[styles.itemText, completions.completedIds.has(item.id) && completionStyles.completedText]}>{item.text}</Text>
                      {item.recurrence ? (
                        <Text style={styles.itemDateSummary}>{formatRecurrenceLabel(item.recurrence)}</Text>
                      ) : hasDateRange(item) && dateTimeRange ? (
                        <Text style={styles.itemDateSummary}>{dateTimeRange}</Text>
                      ) : null}
                    </View>
                    {item.tags && item.tags.length > 0 ? (
                      <View style={styles.itemTagRow}>
                        {item.tags.map((tag) => (
                          <View key={tag.id} style={styles.itemTagChip}>
                            <Text style={styles.itemTagChipText}>{tag.name}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
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
      {pendingDelete ? (
        <UndoSnackbar
          message={`「${pendingDelete.text}」を削除しました`}
          onAction={handleUndoDelete}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default HomeScreen;
