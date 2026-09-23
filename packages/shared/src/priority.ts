export type Priority = "high" | "medium" | "low";

export interface PriorityOption {
  value: Priority;
  label: string;
}

// 表示順は「高→中→低」で固定。並び替え機能を追加する際もこの並びに揃える。
export const PRIORITY_OPTIONS: readonly PriorityOption[] = [
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
];

export const DEFAULT_PRIORITY: Priority = "medium";

const PRIORITY_VALUES = new Set<string>(PRIORITY_OPTIONS.map((option) => option.value));

export function isPriority(value: unknown): value is Priority {
  return typeof value === "string" && PRIORITY_VALUES.has(value);
}
