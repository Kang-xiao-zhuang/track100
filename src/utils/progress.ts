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

export function remaining(goal: Goal): number {
  return Math.max(0, goal.target - goal.current);
}

/** Trim trailing .0 for clean display (72 not 72.0, but 72.5 stays). */
export function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
