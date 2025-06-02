/**
 * Безопасная обёртка для expo-notifications
 * Предотвращает ошибки в Expo Go с SDK 53+ при работе с уведомлениями
 */

import { Platform } from "react-native";

// Константы для определения поддержки уведомлений
export const isNotificationsSupported = !__DEV__; // В development считаем, что не поддерживается
export const isPushNotificationsSupported = !__DEV__ && Platform.OS !== "web";

// Интерфейсы для совместимости
interface NotificationContent {
  title: string;
  body: string;
  data?: object;
}

interface NotificationPermissions {
  status: "granted" | "denied" | "undetermined";
}

// Заглушки для функций
const noopAsync = async () => {};
const mockPermission = async (): Promise<NotificationPermissions> => ({
  status: "granted",
});
const mockSchedule = async (options: {
  content: NotificationContent;
  trigger?: any;
}) => {
  console.log("[DEV] Notification would be shown:", options.content);
  return "mock-notification-id";
};

// Экспортируем API, совместимое с expo-notifications
export const Notifications = {
  // Базовые функции
  requestPermissionsAsync: mockPermission,
  setNotificationHandler: noopAsync,
  scheduleNotificationAsync: mockSchedule,

  // Расширенные функции
  getExpoPushTokenAsync: async () => ({ data: "EXPO-PUSH-TOKEN-MOCK-DEV" }),

  // Обработка событий
  addNotificationReceivedListener: () => ({ remove: noopAsync }),
  addNotificationResponseReceivedListener: () => ({ remove: noopAsync }),

  // Вспомогательные функции
  getBadgeCountAsync: async () => 0,
  setBadgeCountAsync: async () => 0,
  dismissAllNotificationsAsync: noopAsync,
};

export default Notifications;
