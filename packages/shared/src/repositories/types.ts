export interface Category {
  id: number;
  name: string;
  weekdays?: string;
  startDate?: string;
  endDate?: string;
}

export interface SavedItem {
  id: number;
  categoryId?: number;
  text: string;
  date: string;
  startDate?: string;
  endDate?: string;
  weekdays?: string;
  categoryName?: string;
  notificationEnabled: boolean;
}

export interface CreateItemDto {
  categoryId?: number;
  text: string;
  date: string;
  startDate?: string;
  endDate?: string;
  weekdays?: string;
  notificationEnabled?: boolean;
}

export interface UpdateItemDto {
  text?: string;
  notificationEnabled?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  weekdays?: string | null;
  categoryId?: number | null;
}
