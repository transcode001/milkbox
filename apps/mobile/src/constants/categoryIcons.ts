import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

type IconName = ComponentProps<typeof Ionicons>["name"];
export const DEFAULT_CATEGORY_ICON = "pricetag-outline";
export const CATEGORY_ICON_OPTIONS = [
  { name: DEFAULT_CATEGORY_ICON, label: "標準" },
  { name: "sunny-outline", label: "朝" },
  { name: "home-outline", label: "生活" },
  { name: "cart-outline", label: "買い物" },
  { name: "book-outline", label: "勉強" },
  { name: "briefcase-outline", label: "仕事" },
  { name: "heart-outline", label: "健康" },
  { name: "fitness-outline", label: "運動" },
  { name: "restaurant-outline", label: "食事" },
  { name: "cafe-outline", label: "休憩" },
  { name: "moon-outline", label: "夜" },
  { name: "musical-notes-outline", label: "趣味" },
  { name: "people-outline", label: "家族" },
  { name: "train-outline", label: "移動" },
  { name: "wallet-outline", label: "お金" },
] as const satisfies readonly { name: IconName; label: string }[];

export function resolveCategoryIcon(icon?: string | null): IconName {
  return CATEGORY_ICON_OPTIONS.find(option => option.name === icon)?.name ?? DEFAULT_CATEGORY_ICON;
}
