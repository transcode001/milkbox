import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { SavedItem } from "@milkbox/shared";
import { parseWeekdays } from "../utils/weekdays";

const NOTIFICATION_IDS_STORAGE_KEY = "@milkbox_notification_ids";
const TASK_REMINDERS_CHANNEL_ID = "task-reminders";
// 曜日繰り返しは従来通り朝9時固定。単発タスクは登録した開始日時を使う。
// 当日の9時を過ぎて登録した曜日繰り返しは、初回通知が最大7日後になる。
const REMINDER_HOUR = 9;

type NotificationIdsByItem = Record<string, string[]>;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function readNotificationIds(): Promise<NotificationIdsByItem> {
  const value = await AsyncStorage.getItem(NOTIFICATION_IDS_STORAGE_KEY);
  if (!value) return {};

  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as NotificationIdsByItem)
      : {};
  } catch {
    return {};
  }
}

async function writeNotificationIds(ids: NotificationIdsByItem): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_IDS_STORAGE_KEY, JSON.stringify(ids));
}

async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(TASK_REMINDERS_CHANNEL_ID, {
      name: "タスクのリマインダー",
      description: "登録したタスクの開始日や曜日をお知らせします",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#007AFF",
      sound: "default",
    });
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  if (currentPermissions.granted) return true;

  const requestedPermissions = await Notifications.requestPermissionsAsync();
  return requestedPermissions.granted;
}

export async function initializeNotificationsAsync(): Promise<boolean> {
  try {
    return await ensureNotificationPermission();
  } catch (error) {
    console.warn("Failed to initialize notifications", error);
    return false;
  }
}

export async function cancelTaskNotificationsAsync(itemId: number): Promise<void> {
  try {
    const idsByItem = await readNotificationIds();
    const identifiers = idsByItem[String(itemId)] ?? [];

    await Promise.allSettled(
      identifiers.map((identifier) =>
        Notifications.cancelScheduledNotificationAsync(identifier),
      ),
    );

    delete idsByItem[String(itemId)];
    await writeNotificationIds(idsByItem);
  } catch (error) {
    console.warn(`Failed to cancel notifications for item ${itemId}`, error);
  }
}

export async function cancelAllTaskNotificationsAsync(): Promise<void> {
  try {
    const idsByItem = await readNotificationIds();
    const identifiers = Object.values(idsByItem).flat();

    await Promise.allSettled(
      identifiers.map((identifier) =>
        Notifications.cancelScheduledNotificationAsync(identifier),
      ),
    );
    await AsyncStorage.removeItem(NOTIFICATION_IDS_STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to cancel all task notifications", error);
  }
}

export function createReminderDate(item: SavedItem): Date | null {
  const source = item.startDate ?? item.endDate;
  if (!source) return null;

  const sourceDate = new Date(source);
  if (Number.isNaN(sourceDate.getTime())) return null;

  if (source.includes("T") || source.includes(" ")) {
    return sourceDate;
  }

  // "YYYY-MM-DD" is parsed as UTC midnight; extract components from the string
  // directly to avoid a day-shift in UTC- timezones.
  const parts = source.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day, REMINDER_HOUR, 0, 0, 0);
}

export function shouldScheduleNotification(item: SavedItem): boolean {
  if (!item.notificationEnabled) return false;

  const weekdays = parseWeekdays(item.weekdays);
  if (weekdays.length > 0) {
    // 曜日繰り返しは常に対象（直近の発生日が必ず未来にあるため）
    return true;
  }

  const reminderDate = createReminderDate(item);
  if (!reminderDate) return false;

  return reminderDate.getTime() > Date.now();
}

export async function scheduleTaskNotificationsAsync(item: SavedItem): Promise<string[]> {
  try {
    await cancelTaskNotificationsAsync(item.id);

    if (!item.notificationEnabled) return [];

    const hasPermission = await ensureNotificationPermission();
    if (!hasPermission) return [];

    const content: Notifications.NotificationContentInput = {
      title: "Milkbox",
      body: item.text,
      sound: "default",
      data: {
        itemId: item.id,
        screen: "Home",
      },
    };

    const identifiers: string[] = [];
    const weekdays = parseWeekdays(item.weekdays);

    if (weekdays.length > 0) {
      const startHasTime = item.startDate?.includes("T") || item.startDate?.includes(" ");
      const notifyHour = startHasTime
        ? new Date(item.startDate!).getHours()
        : REMINDER_HOUR;
      const notifyMinute = startHasTime
        ? new Date(item.startDate!).getMinutes()
        : 0;

      try {
        for (const weekday of weekdays) {
          const identifier = await Notifications.scheduleNotificationAsync({
            content,
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: weekday + 1,
              hour: notifyHour,
              minute: notifyMinute,
              channelId: TASK_REMINDERS_CHANNEL_ID,
            },
          });
          identifiers.push(identifier);
        }
      } catch (error) {
        await Promise.allSettled(
          identifiers.map((id) => Notifications.cancelScheduledNotificationAsync(id)),
        );
        throw error;
      }
    } else {
      const reminderDate = createReminderDate(item);
      if (!reminderDate || reminderDate.getTime() <= Date.now()) return [];

      const identifier = await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
          channelId: TASK_REMINDERS_CHANNEL_ID,
        },
      });
      identifiers.push(identifier);
    }

    const idsByItem = await readNotificationIds();
    idsByItem[String(item.id)] = identifiers;
    await writeNotificationIds(idsByItem);

    return identifiers;
  } catch (error) {
    console.warn(`Failed to schedule notifications for item ${item.id}`, error);
    throw error;
  }
}
