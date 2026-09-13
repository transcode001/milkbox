export interface Category {
  id: number;
  name: string;
  weekdays?: string;
  startDate?: string;
  endDate?: string;
  color: string;
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
}

export interface ItemCompletion {
  itemId: number;
  date: string;
  completedAt: string;
}
