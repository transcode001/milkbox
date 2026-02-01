import { SavedItem, CreateItemDto, UpdateItemDto } from './types';

export interface IItemRepository {
  initialize(): Promise<void>;
  findAll(): Promise<SavedItem[]>;
  findById(id: number): Promise<SavedItem | null>;
  create(id:number,text: string): Promise<SavedItem>;
  update(id: number, data: UpdateItemDto): Promise<void>;
  delete(id: number): Promise<void>;
}