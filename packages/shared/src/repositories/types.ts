export interface SavedItem {
  id: number;
  text: string;
  date: string;
}

export interface CreateItemDto {
  text: string;
}

export interface UpdateItemDto {
  text?: string;
}