import { SavedItem, CreateItemDto, UpdateItemDto, Tag } from './types';

export interface IItemRepository {
  findAll(): Promise<SavedItem[]>;
  findById(id: number): Promise<SavedItem | null>;
  create(data: CreateItemDto): Promise<SavedItem>;
  update(id: number, data: UpdateItemDto): Promise<void>;
  delete(id: number): Promise<void>;
}

export interface ITagRepository {
  findAll(): Promise<Tag[]>;
  // 同名タグが既にあればそれを返す(find-or-create)。同じタグ名を何度入力しても重複させない。
  create(name: string): Promise<Tag>;
  delete(id: number): Promise<void>;
  findTagsForItem(itemId: number): Promise<Tag[]>;
  findAllItemTags(): Promise<{ itemId: number; tag: Tag }[]>;
}