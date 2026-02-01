import { Platform } from 'react-native';
import { IItemRepository } from '@milkbox/shared';
import { SQLiteItemRepository } from './sqlite/ItemRepository';
import { AsyncStorageItemRepository } from './asyncStorage/ItemRepository';

export function createItemRepository(): IItemRepository {
  // Webの場合はAsyncStorage、ネイティブの場合はSQLite
  return Platform.OS === 'web' 
    ? new AsyncStorageItemRepository() 
    : new SQLiteItemRepository();
}

export const itemRepository = createItemRepository();