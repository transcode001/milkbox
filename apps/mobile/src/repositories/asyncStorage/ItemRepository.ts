import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_REMINDER_MINUTES, IItemRepository, SavedItem, CreateItemDto, UpdateItemDto } from '@milkbox/shared';

type StoredItem = Omit<SavedItem, 'notificationEnabled' | 'notificationMinutesBefore'> & {
  notificationEnabled?: boolean | number;
  notificationMinutesBefore?: number;
};

export class AsyncStorageItemRepository implements IItemRepository {
  private readonly STORAGE_KEY = '@milkbox_items';

  async initialize(): Promise<void> {
    // 初期化処理
  }

  async findAll(): Promise<SavedItem[]> {
    const jsonValue = await AsyncStorage.getItem(this.STORAGE_KEY);
    const items: StoredItem[] = jsonValue ? JSON.parse(jsonValue) : [];
    return items.map((item) => ({
      ...item,
      notificationEnabled:
        item.notificationEnabled !== false && item.notificationEnabled !== 0,
      notificationMinutesBefore: item.notificationMinutesBefore ?? DEFAULT_REMINDER_MINUTES,
    }));
  }

  async findById(id: number): Promise<SavedItem | null> {
    const items = await this.findAll();
    return items.find(item => item.id === id) || null;
  }

  async create(data: CreateItemDto): Promise<SavedItem> {
    const items = await this.findAll();
    const newItem: SavedItem = {
      id: Date.now(),
      categoryId: data.categoryId,
      text: data.text,
      date: data.date,
      startDate: data.startDate,
      endDate: data.endDate,
      weekdays: data.weekdays,
      notificationEnabled: data.notificationEnabled !== false,
      notificationMinutesBefore: data.notificationMinutesBefore ?? DEFAULT_REMINDER_MINUTES,
    };
    items.unshift(newItem);
    await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    return newItem;
  }

  async update(id: number, data: UpdateItemDto): Promise<void> {
    const items = await this.findAll();
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      if (data.text !== undefined) {
        items[index].text = data.text;
      }
      if (data.notificationEnabled !== undefined) {
        items[index].notificationEnabled = data.notificationEnabled;
      }
      if (data.notificationMinutesBefore !== undefined) {
        items[index].notificationMinutesBefore = data.notificationMinutesBefore;
      }
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    }
  }

  async delete(id: number): Promise<void> {
    const items = await this.findAll();
    const filtered = items.filter(item => item.id !== id);
    await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
  }
}
