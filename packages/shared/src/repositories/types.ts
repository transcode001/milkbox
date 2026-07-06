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
}
