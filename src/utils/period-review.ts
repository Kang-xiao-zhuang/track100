import type { Goal, GoalCategory, ProgressRecord } from "@/types/goal";
import { dayKey } from "@/utils/date";
import { shiftPeriodKey } from "@/utils/habit";

export type ReviewPeriod = "week" | "month" | "year";

export interface PeriodBucket {
  /** 图表 X 轴短标签 */
  label: string;
  /** 该桶内的打卡次数 */
  count: number;
  /** 对应的日期键(用于 bestBucket 高亮) */
  key: string;
}

export interface PeriodReview {
  period: ReviewPeriod;
  /** 当前窗口标识,如 2026 / 2026-11 / 2026-W46 */
  key: string;
  /** 展示用标题(由 i18n 在 UI 层生成,这里给原始参数) */
  anchorYear: number;
  anchorMonth: number;
  weekNo: number;
  checkIns: number;
  litCells: number;
  activeDays: number;
  longestStreak: number;
  completed: Goal[];
  buckets: PeriodBucket[];
  topCategory: { category: GoalCategory; count: number } | null;
  goalRanks: { goal: Goal; checkIns: number; cells: number }[];
  activeGoals: number;
  notes: number;
  heat: { key: string; count: number }[];
  bestBucket: PeriodBucket | null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 本地周一。 */
function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

/** ISO 周序号(以周一为周首)。 */
function isoWeek(d: Date): number {
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  const day = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - day + 3); // 周四
  const firstThursday = new Date(target.getFullYear(), 0, 4, 12);
  const fday = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - fday + 3);
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 86400000));
}

interface Window {
  startKey: string;
  endKey: string;
  key: string;
  weekNo: number;
  buckets: { label: string; key: string }[];
  heatKeys: string[];
}

/** 计算某个周期的时间窗(本地日期键,字符串可比较)。 */
export function periodWindow(period: ReviewPeriod, anchor: Date, now: Date = new Date()): Window {
  if (period === "week") {
    const mon = mondayOf(anchor);
    const keys: string[] = [];
    const buckets: { label: string; key: string }[] = [];
    const weekLabels = ["一", "二", "三", "四", "五", "六", "日"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const k = dayKey(d);
      keys.push(k);
      buckets.push({ label: weekLabels[i], key: k });
    }
    return {
      startKey: keys[0],
      endKey: keys[6],
      key: `${mon.getFullYear()}-W${pad(isoWeek(anchor))}`,
      weekNo: isoWeek(anchor),
      buckets,
      heatKeys: keys,
    };
  }

  if (period === "month") {
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    const last = new Date(y, m + 1, 0).getDate();
    const keys: string[] = [];
    const buckets: { label: string; key: string }[] = [];
    for (let day = 1; day <= last; day++) {
      const k = `${y}-${pad(m + 1)}-${pad(day)}`;
      keys.push(k);
      // 标签太密,X 轴只显示每 5 天
      buckets.push({ label: day % 5 === 1 || day === last ? String(day) : "", key: k });
    }
    return {
      startKey: keys[0],
      endKey: keys[keys.length - 1],
      key: `${y}-${pad(m + 1)}`,
      weekNo: 0,
      buckets,
      heatKeys: keys,
    };
  }

  // year
  const y = anchor.getFullYear();
  const buckets: { label: string; key: string }[] = [];
  for (let m = 1; m <= 12; m++) buckets.push({ label: String(m), key: `${y}-${pad(m)}` });
  const heatKeys: string[] = [];
  const start = new Date(y, 0, 1, 12);
  const last = y === now.getFullYear() ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12) : new Date(y, 11, 31, 12);
  for (const d = new Date(start); d.getTime() <= last.getTime(); d.setDate(d.getDate() + 1)) heatKeys.push(dayKey(d));
  return {
    startKey: `${y}-01-01`,
    endKey: `${y}-12-31`,
    key: String(y),
    weekNo: 0,
    buckets,
    heatKeys,
  };
}

/** 周期平移:dir = -1 上一个, +1 下一个。 */
export function shiftPeriod(period: ReviewPeriod, anchor: Date, dir: -1 | 1): Date {
  if (period === "week") {
    const d = new Date(anchor);
    d.setDate(d.getDate() + dir * 7);
    return d;
  }
  if (period === "month") return new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1, 12);
  return new Date(anchor.getFullYear() + dir, 0, 1, 12);
}

/** 该周期是否可继续往后(不能超过当前周期)。 */
export function canGoNext(period: ReviewPeriod, anchor: Date, now: Date = new Date()): boolean {
  return periodWindow(period, anchor, now).startKey < periodWindow(period, now, now).startKey;
}

/**
 * 通用周期回顾:全部由 goals + history 实时推导。
 * 软删除目标排除,归档目标保留。
 */
export function buildPeriodReview(
  goals: Goal[],
  history: ProgressRecord[],
  period: ReviewPeriod,
  anchor: Date,
  now: Date = new Date(),
): PeriodReview {
  const win = periodWindow(period, anchor, now);
  const goalMap = new Map(goals.filter((g) => !g.deletedAt).map((g) => [g.id, g]));
  const inRange = (key: string) => key >= win.startKey && key <= win.endKey;

  const records = history.filter(
    (r) => r.value > 0 && goalMap.has(r.goalId) && inRange(dayKey(r.createdAt)),
  );

  const byDay = new Map<string, number>();
  const bucketCount = new Map<string, number>();
  const byCategory = new Map<GoalCategory, number>();
  const rankMap = new Map<string, { goal: Goal; checkIns: number; cells: number }>();
  let cellsRaw = 0;
  let notes = 0;

  for (const r of records) {
    const key = dayKey(r.createdAt);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
    const goal = goalMap.get(r.goalId)!;
    const bKey = period === "year" ? key.slice(0, 7) : key;
    bucketCount.set(bKey, (bucketCount.get(bKey) ?? 0) + 1);
    const cells = goal.target > 0 ? (r.value / goal.target) * 100 : 0;
    cellsRaw += cells;
    byCategory.set(goal.category, (byCategory.get(goal.category) ?? 0) + 1);
    if (r.note) notes++;
    const rank = rankMap.get(goal.id) ?? { goal, checkIns: 0, cells: 0 };
    rank.checkIns += 1;
    rank.cells += cells;
    rankMap.set(goal.id, rank);
  }

  // 窗口内最长连续打卡
  const days = [...byDay.keys()].sort();
  let longestStreak = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of days) {
    run = prev !== null && shiftPeriodKey(prev, "daily", 1) === key ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    prev = key;
  }

  const buckets: PeriodBucket[] = win.buckets.map((b) => ({ ...b, count: bucketCount.get(b.key) ?? 0 }));
  const bestBucket = buckets.reduce<PeriodBucket | null>(
    (best, b) => (best === null || b.count > best.count ? b : best),
    null,
  );
  const categories = [...byCategory.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
  const goalRanks = [...rankMap.values()].sort((a, b) => b.cells - a.cells || b.checkIns - a.checkIns);
  const heat = win.heatKeys.map((key) => ({ key, count: byDay.get(key) ?? 0 }));

  const completed = goals.filter(
    (g) => !g.deletedAt && !!g.completedAt && inRange(dayKey(g.completedAt!)),
  );

  return {
    period,
    key: win.key,
    anchorYear: anchor.getFullYear(),
    anchorMonth: anchor.getMonth() + 1,
    weekNo: win.weekNo,
    checkIns: records.length,
    litCells: Math.round(cellsRaw),
    activeDays: byDay.size,
    longestStreak,
    completed,
    buckets,
    topCategory: categories[0] ?? null,
    goalRanks,
    activeGoals: rankMap.size,
    notes,
    heat,
    bestBucket: bestBucket && bestBucket.count > 0 ? bestBucket : null,
  };
}
