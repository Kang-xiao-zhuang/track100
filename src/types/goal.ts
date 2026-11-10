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

/** cumulative = 累计到 target 即完成;habit = 按周期坚持,看重连击与坚持率。 */
export type GoalType = "cumulative" | "habit";
export type HabitPeriod = "daily" | "weekly";

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
  /** 软删除时间戳。存在即视为在回收站中;旧备份无此字段 = 未删除。 */
  deletedAt?: string;
  /** 首次达到 target 的时间。撤销后若回落到未完成则清除。 */
  completedAt?: string;
  /** 目标类型。旧数据无此字段 = cumulative。 */
  type?: GoalType;
  /** 习惯型目标的打卡周期,默认 daily。 */
  habitPeriod?: HabitPeriod;
  /** 首页排序权重,升序;负数表示置顶。旧数据无此字段 = 按创建顺序。 */
  order?: number;
}

export interface ProgressRecord {
  id: string;
  goalId: string;
  /** Signed delta applied (positive for check-in, negative for undo). */
  value: number;
  note?: string;
  createdAt: string;
  /** 是否为补打卡(createdAt 由用户指定,而非当下时刻)。旧备份无此字段 = 实时打卡。 */
  backfilled?: boolean;
}

export interface Settings {
  theme: "light" | "dark";
  growthMode: GrowthMode;
  language: "zh" | "en";
  reminderEnabled: boolean;
  reminderTime: string; // "HH:MM",每日提醒时间
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
  completedAt?: string;
}
