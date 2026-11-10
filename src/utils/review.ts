import type { Goal, GoalCategory, ProgressRecord } from "@/types/goal";
import { dayKey } from "@/utils/date";
import { shiftPeriodKey } from "@/utils/habit";

export interface GoalRank {
  goal: Goal;
  checkIns: number;
  cells: number;
}

export interface YearReview {
  year: number;
  /** 该年所有正向打卡次数。 */
  checkIns: number;
  /** 该年推动的「格子」总量:每条记录按 value / target * 100 折算后求和。 */
  litCells: number;
  activeDays: number;
  longestStreak: number;
  /** completedAt 落在该年的目标(含已归档,排除回收站)。 */
  completed: Goal[];
  monthly: { month: number; count: number }[];
  topCategory: { category: GoalCategory; count: number } | null;
  goalRanks: GoalRank[];
  activeGoals: number;
  notes: number;
  heat: { key: string; count: number }[];
  bestMonth: number | null;
}

/** 用本地日期判断年份,和 dayKey / 打卡记录保持同一时区口径。 */
const yearOf = (iso: string) => Number(dayKey(iso).slice(0, 4));

/** 可切换的年份:有记录 / 有目标创建或完成的年份 + 今年。 */
export function availableYears(goals: Goal[], history: ProgressRecord[], now: Date = new Date()): number[] {
  const years = new Set<number>([now.getFullYear()]);
  for (const r of history) if (r.value > 0) years.add(yearOf(r.createdAt));
  for (const g of goals) {
    if (g.deletedAt) continue;
    years.add(yearOf(g.createdAt));
    if (g.completedAt) years.add(yearOf(g.completedAt));
  }
  return [...years].sort((a, b) => b - a);
}

/**
 * 年度回顾:全部由 goals + history 实时推导,不存冗余。
 * 软删除目标的记录被排除(避免回收站内容混进回顾),归档目标保留(成果不该消失)。
 */
export function buildReview(
  goals: Goal[],
  history: ProgressRecord[],
  year: number,
  now: Date = new Date(),
): YearReview {
  const goalMap = new Map(goals.filter((g) => !g.deletedAt).map((g) => [g.id, g]));
  const records = history.filter(
    (r) => r.value > 0 && yearOf(r.createdAt) === year && goalMap.has(r.goalId),
  );

  const byDay = new Map<string, number>();
  const byMonth = new Map<number, number>();
  const byCategory = new Map<GoalCategory, number>();
  const rankMap = new Map<string, GoalRank>();
  let cellsRaw = 0;
  let notes = 0;

  for (const r of records) {
    const key = dayKey(r.createdAt);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
    const month = Number(key.slice(5, 7));
    byMonth.set(month, (byMonth.get(month) ?? 0) + 1);

    const goal = goalMap.get(r.goalId)!;
    const cells = goal.target > 0 ? (r.value / goal.target) * 100 : 0;
    cellsRaw += cells;
    byCategory.set(goal.category, (byCategory.get(goal.category) ?? 0) + 1);
    if (r.note) notes++;

    const rank = rankMap.get(goal.id) ?? { goal, checkIns: 0, cells: 0 };
    rank.checkIns += 1;
    rank.cells += cells;
    rankMap.set(goal.id, rank);
  }

  // 年内最长连续打卡天数
  const days = [...byDay.keys()].sort();
  let longestStreak = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of days) {
    run = prev !== null && shiftPeriodKey(prev, "daily", 1) === key ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    prev = key;
  }

  const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, count: byMonth.get(i + 1) ?? 0 }));
  const topMonth = monthly.reduce((best, m) => (m.count > best.count ? m : best), monthly[0]);
  const categories = [...byCategory.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
  const goalRanks = [...rankMap.values()].sort((a, b) => b.cells - a.cells || b.checkIns - a.checkIns);

  // 全年热力:未来日期不画(当前年只到今天)
  const heat: { key: string; count: number }[] = [];
  const start = new Date(year, 0, 1, 12);
  const lastDay = year === now.getFullYear()
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
    : new Date(year, 11, 31, 12);
  for (const d = new Date(start); d.getTime() <= lastDay.getTime(); d.setDate(d.getDate() + 1)) {
    const key = dayKey(d);
    heat.push({ key, count: byDay.get(key) ?? 0 });
  }

  return {
    year,
    checkIns: records.length,
    litCells: Math.round(cellsRaw),
    activeDays: byDay.size,
    longestStreak,
    completed: goals.filter((g) => !g.deletedAt && !!g.completedAt && yearOf(g.completedAt!) === year),
    monthly,
    topCategory: categories[0] ?? null,
    goalRanks,
    activeGoals: rankMap.size,
    notes,
    heat,
    bestMonth: topMonth.count > 0 ? topMonth.month : null,
  };
}
