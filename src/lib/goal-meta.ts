import type { GoalCategory, GoalUnit } from "@/types/goal";

// Display metadata for categories & units. Keep labels here so UI never hardcodes them.

export const CATEGORIES: { value: GoalCategory; label: string; emoji: string }[] = [
  { value: "learning", label: "学习", emoji: "📚" },
  { value: "health", label: "健康", emoji: "🥗" },
  { value: "fitness", label: "健身", emoji: "💪" },
  { value: "work", label: "工作", emoji: "💼" },
  { value: "life", label: "生活", emoji: "🌿" },
  { value: "finance", label: "理财", emoji: "💰" },
  { value: "other", label: "其他", emoji: "✨" },
];

export const UNITS: { value: GoalUnit; label: string }[] = [
  { value: "hours", label: "小时" },
  { value: "days", label: "天" },
  { value: "books", label: "本" },
  { value: "times", label: "次" },
  { value: "km", label: "公里" },
  { value: "pages", label: "页" },
  { value: "custom", label: "自定义" },
];

/** Preset accent colors a goal can pick. */
export const COLORS = [
  "#556B2F", // olive
  "#3B82F6", // blue
  "#22C55E", // green
  "#F97316", // orange
  "#A855F7", // purple
  "#EF4444", // red
  "#14B8A6", // teal
  "#EC4899", // pink
];

export const GOAL_ICONS = ["📚", "💪", "🏃", "✍️", "🎯", "🧠", "🎸", "🌱", "💰", "🧘", "🍳", "🗺️"];

export function categoryLabel(c: GoalCategory): string {
  return CATEGORIES.find((x) => x.value === c)?.label ?? c;
}

export function unitLabel(u: GoalUnit): string {
  return UNITS.find((x) => x.value === u)?.label ?? u;
}
