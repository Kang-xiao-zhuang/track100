import type { Goal, GoalCategory, ProgressRecord } from "@/types/goal";
import { isComplete } from "@/utils/progress";

export interface Overview {
  totalGoals: number;
  completedGoals: number;
  activeGoals: number;
  totalRecords: number;
  completionRate: number; // 0..100
}

export function overview(goals: Goal[], history: ProgressRecord[]): Overview {
  const active = goals.filter((g) => !g.archived);
  const completed = active.filter(isComplete).length;
  return {
    totalGoals: active.length,
    completedGoals: completed,
    activeGoals: active.length - completed,
    totalRecords: history.length,
    completionRate: active.length ? Math.round((completed / active.length) * 100) : 0,
  };
}

/** Goal count per category (only non-archived, non-empty buckets). */
export function byCategory(goals: Goal[]): { category: GoalCategory; count: number }[] {
  const map = new Map<GoalCategory, number>();
  for (const g of goals) {
    if (g.archived) continue;
    map.set(g.category, (map.get(g.category) ?? 0) + 1);
  }
  return [...map.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
}

/** Records per day for the last `days` days (oldest→newest), for the monthly/heat charts. */
export function dailyCounts(history: ProgressRecord[], days = 30): { date: string; count: number }[] {
  const now = new Date();
  const out: { date: string; count: number }[] = [];
  const bucket = new Map<string, number>();
  for (const r of history) {
    if (r.value <= 0) continue; // only count check-ins
    const key = r.createdAt.slice(0, 10);
    bucket.set(key, (bucket.get(key) ?? 0) + 1);
  }
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key.slice(5), count: bucket.get(key) ?? 0 });
  }
  return out;
}

/** Consecutive days (ending today or yesterday) with at least one check-in. */
export function streak(history: ProgressRecord[]): number {
  const days = new Set(history.filter((r) => r.value > 0).map((r) => r.createdAt.slice(0, 10)));
  if (days.size === 0) return 0;
  const cursor = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (!days.has(iso(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(iso(cursor))) return 0;
  }
  let n = 0;
  while (days.has(iso(cursor))) {
    n++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}
