export interface SavedItem {
  id: number;
  categoryId?: number;
  text: string;
  date: string;
  categoryName?: string;
}

export interface CreateItemDto {
  text: string;
}

export interface UpdateItemDto {
  text?: string;
}