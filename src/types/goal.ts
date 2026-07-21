// Core domain types — see docs/07-DATA-MODEL.md. The whole app derives from Goal + ProgressRecord.

export type GoalCategory =
  | "learning"
  | "health"
  | "work"
  | "life"
  | "finance"
  | "fitness"
  | "other";

export type GoalUnit = "hours" | "days" | "books" | "times" | "km" | "pages" | "custom";

export type GrowthMode = "grid" | "ring" | "bar" | "tree" | "heatmap";

export interface Goal {
  id: string;
  title: string;
  description?: string;
  icon: string;
  color: string;
  category: GoalCategory;
  unit: GoalUnit;
  target: number;
  current: number;
  /** How much one "打卡" adds by default (e.g. +1 book, +5 km). */
  step: number;
  createdAt: string;
  updatedAt: string;
  startDate?: string;
  endDate?: string;
  archived: boolean;
}

export interface ProgressRecord {
  id: string;
  goalId: string;
  /** Signed delta applied (positive for check-in, negative for undo). */
  value: number;
  note?: string;
  createdAt: string;
}

export interface Settings {
  theme: "light" | "dark";
  growthMode: GrowthMode;
  language: "zh" | "en";
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
  completedAt?: string;
}
