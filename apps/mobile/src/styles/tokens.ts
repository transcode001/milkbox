import { Platform } from "react-native";

const platformValue = <T>(ios: T, android: T): T =>
  Platform.select({ ios, android, default: ios }) as T;

const primaryIos = "#007AFF";
const primaryAndroid = "#1976D2";
const destructiveIos = "#D11A2A";
const destructiveAndroid = "#B3261E";
const groupedBackgroundIos = "#F2F2F7";
const groupedBackgroundAndroid = "#F2F2F7";
const cancelBackgroundIos = "#F2F2F7";
const cancelBackgroundAndroid = "#D1E4FF";
const tabInactiveIos = "#8E8E93";
const tabInactiveAndroid = "#49454F";

export const colors = {
  primaryIos,
  primaryAndroid,
  onPrimary: "#FFFFFF",
  textPrimary: "#000000",
  textSecondary: "#666666",
  destructiveIos,
  destructiveAndroid,
  background: "#FFFFFF",
  groupedBackgroundIos,
  cancelBackgroundIos,
  cancelBackgroundAndroid,
  tabInactiveIos,
  tabInactiveAndroid,
  // フォーム送信などの肯定的アクション用。プラットフォームによる作り分けは行わない。
  success: "#28a745",

  primary: platformValue(primaryIos, primaryAndroid),
  destructive: platformValue(destructiveIos, destructiveAndroid),
  groupedBackground: platformValue(groupedBackgroundIos, groupedBackgroundAndroid),
  cancelBackground: platformValue(cancelBackgroundIos, cancelBackgroundAndroid),
  tabInactive: platformValue(tabInactiveIos, tabInactiveAndroid),
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

const smIos = 6;
const mdIos = 8;
const smAndroid = 20;
const mdAndroid = 20;
const modalIos = 12;
const modalAndroid = 28;

export const radii = {
  smIos,
  mdIos,
  smAndroid,
  mdAndroid,
  modalIos,
  modalAndroid,

  sm: platformValue(smIos, smAndroid),
  md: platformValue(mdIos, mdAndroid),
  modal: platformValue(modalIos, modalAndroid),
} as const;
