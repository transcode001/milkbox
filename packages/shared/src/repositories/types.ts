import { Priority } from '../priority';
import { Recurrence } from '../recurrence';

export interface Category {
  icon?: string;
  id: number;
  name: string;
  weekdays?: string;
  startDate?: string;
  endDate?: string;
  color: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface SavedItem {
  id: number;
  categoryId?: number;
  text: string;
  date: string;
  startDate?: string;
  endDate?: string;
  weekdays?: string;
  color: string;
  categoryName?: string;
  // findAllWithCategory() が categories とJOINした時だけ埋まる、カテゴリ自体の色
  categoryColor?: string;
  notificationEnabled: boolean;
  // 開始日時の何分前に通知するか(Google Calendarの選択肢に準拠、既定30分)
  notificationMinutesBefore: number;
  priority: Priority;
  // item_tagsを別クエリで引いてJS側でマージした時だけ埋まる(itemsテーブル自体には持たない)
  tags?: Tag[];
  // weekdaysによる毎週繰り返しとは独立した繰り返しパターン。指定時はstartDateの
  // 日付部分を起点として扱う(packages/shared/src/recurrence.ts参照)。
  recurrence?: Recurrence;
}

export interface CreateItemDto {
  categoryId?: number;
  text: string;
  date: string;
  startDate?: string;
  endDate?: string;
  weekdays?: string;
  color?: string;
  notificationEnabled?: boolean;
  notificationMinutesBefore?: number;
  priority?: Priority;
  tagIds?: number[];
  recurrence?: Recurrence;
}

export interface UpdateItemDto {
  text?: string;
  notificationEnabled?: boolean;
  notificationMinutesBefore?: number;
  startDate?: string | null;
  endDate?: string | null;
  weekdays?: string | null;
  categoryId?: number | null;
  color?: string;
  priority?: Priority;
  // 指定した場合、アイテムのタグ集合をこのidの集合で丸ごと置き換える
  tagIds?: number[];
  recurrence?: Recurrence | null;
}

export interface ItemCompletion {
  itemId: number;
  date: string;
  completedAt: string;
}
