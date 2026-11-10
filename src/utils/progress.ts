import type { Goal } from "@/types/goal";

/** 0..1 completion ratio, clamped. */
export function ratio(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(1, Math.max(0, current / target));
}

/** Whole-percent 0..100. */
export function percent(current: number, target: number): number {
  return Math.round(ratio(current, target) * 100);
}

/**
 * The grid is ALWAYS 100 cells; each cell = 1% of the target.
 * So a 500km goal and a 100-book goal both light up 0..100 cells by progress.
 */
export function cellsLit(current: number, target: number): number {
  return Math.floor(ratio(current, target) * 100);
}

export function isComplete(goal: Goal): boolean {
  return goal.current >= goal.target;
}

/** 习惯型目标:按周期打卡,UI 展示连击/坚持率而非百分比。旧数据视为累计型。 */
export function isHabit(goal: Goal): boolean {
  return goal.type === "habit";
}

/** 首页排序:order 升序,未设置的保持原有数组顺序(稳定的 index 兜底)。 */
export function sortGoals(goals: Goal[]): Goal[] {
  return goals
    .map((g, index) => ({ g, index }))
    .sort((a, b) => (a.g.order ?? 0) - (b.g.order ?? 0) || a.index - b.index)
    .map(({ g }) => g);
}

/** 负的 order = 置顶。 */
export function isPinned(goal: Goal): boolean {
  return (goal.order ?? 0) < 0;
}

export function remaining(goal: Goal): number {
  return Math.max(0, goal.target - goal.current);
}

/** Trim trailing .0 for clean display (72 not 72.0, but 72.5 stays). */
export function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** 快捷打卡候选:未归档、未完成,最近动过的在前。 */
export function shortcutGoals(goals: Goal[], max = 4): Goal[] {
  return goals
    .filter((g) => !g.archived && !g.deletedAt && !isComplete(g))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, max);
}
