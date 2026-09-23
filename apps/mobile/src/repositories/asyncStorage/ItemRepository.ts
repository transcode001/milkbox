import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PRIORITY, DEFAULT_REMINDER_MINUTES, IItemRepository, isPriority, Priority, SavedItem, CreateItemDto, UpdateItemDto } from '@milkbox/shared';
import { DEFAULT_COLORS } from '../../constants/colors';

const DEFAULT_TASK_COLOR = DEFAULT_COLORS.task;

type StoredItem = Omit<SavedItem, 'notificationEnabled' | 'notificationMinutesBefore' | 'priority'> & {
  notificationEnabled?: boolean | number;
  notificationMinutesBefore?: number;
  priority?: Priority;
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
      color: item.color ?? DEFAULT_TASK_COLOR,
      notificationEnabled:
        item.notificationEnabled !== false && item.notificationEnabled !== 0,
      notificationMinutesBefore: item.notificationMinutesBefore ?? DEFAULT_REMINDER_MINUTES,
      priority: isPriority(item.priority) ? item.priority : DEFAULT_PRIORITY,
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
      color: data.color ?? DEFAULT_TASK_COLOR,
      notificationEnabled: data.notificationEnabled !== false,
      notificationMinutesBefore: data.notificationMinutesBefore ?? DEFAULT_REMINDER_MINUTES,
      priority: data.priority ?? DEFAULT_PRIORITY,
      recurrence: data.recurrence,
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
      if (data.color !== undefined) {
        items[index].color = data.color;
      }
      if (data.priority !== undefined) {
        items[index].priority = data.priority;
      }
      if (data.recurrence !== undefined) {
        items[index].recurrence = data.recurrence ?? undefined;
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
