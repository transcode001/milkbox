export interface SavedItem {
  id: number;
  categoryId?: number;
  text: string;
  date: string;
  startDate?: string;
  endDate?: string;
  categoryName?: string;
}

export interface CreateItemDto {
  categoryId?: number;
  text: string;
  date: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateItemDto {
  text?: string;
}