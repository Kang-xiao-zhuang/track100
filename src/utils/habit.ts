import type { Goal, HabitPeriod, ProgressRecord } from "@/types/goal";
import { dayKey } from "@/utils/date";

const DAY = 86400000;

/** 把本地日期字符串当正午解析,规避夏令时造成的 23/25 小时误差。 */
const noon = (key: string) => new Date(`${key}T12:00:00`).getTime();
const diffDays = (from: string, to: string) => Math.round((noon(to) - noon(from)) / DAY);

/**
 * 周期键:daily = 本地日期 YYYY-MM-DD;weekly = 该周周一的日期。
 * 两种键都是 YYYY-MM-DD,可以直接字典序比较。
 */
export function periodKey(date: Date | string, period: HabitPeriod): string {
  const d = typeof date === "string" ? new Date(date) : new Date(date.getTime());
  if (period === "weekly") {
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return dayKey(monday);
  }
  return dayKey(d);
}

export function shiftPeriodKey(key: string, period: HabitPeriod, delta: number): string {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + delta * (period === "weekly" ? 7 : 1));
  return periodKey(d, period);
}

export interface PeriodCell {
  key: string;
  count: number;
}

export interface HabitStats {
  /** 当前连续周期数(本周期还没打卡时,从上个周期算起,给当天留宽限)。 */
  streak: number;
  /** 历史最长连续周期数。 */
  longest: number;
  /** 有打卡的周期总数。 */
  checkedPeriods: number;
  /** 自创建以来经过的周期总数(含当前周期)。 */
  elapsedPeriods: number;
  /** 坚持率 0..100 = checked / elapsed。 */
  consistency: number;
  /** 最近 N 个周期,用于热力格;oldest → newest。 */
  recent: PeriodCell[];
  /** 本周期是否已打卡。 */
  doneThisPeriod: boolean;
}

/**
 * 习惯目标的全部统计都是实时推导,不落盘。
 * 一个周期内允许多次打卡(如「喝水 8 杯」),但「是否达标」按该周期至少一条正向记录算。
 */
export function habitStats(
  goal: Goal,
  records: ProgressRecord[],
  period: HabitPeriod = goal.habitPeriod ?? "daily",
  now: Date = new Date(),
): HabitStats {
  const counts = new Map<string, number>();
  for (const r of records) {
    if (r.value <= 0) continue;
    const key = periodKey(r.createdAt, period);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const keys = [...counts.keys()].sort();
  const checked = new Set(keys);
  const currentKey = periodKey(now, period);
  const startKey = periodKey(goal.createdAt, period);

  const spanDays = Math.max(0, diffDays(startKey, currentKey));
  const elapsedPeriods = Math.max(1, (period === "weekly" ? Math.floor(spanDays / 7) : spanDays) + 1);

  // 当前连击:本周期已打则从本周期起算,否则从上一周期起算(今天还没打卡不立刻清零)
  let streak = 0;
  let cursor = checked.has(currentKey) ? currentKey : shiftPeriodKey(currentKey, period, -1);
  while (checked.has(cursor) && streak < 10000) {
    streak++;
    cursor = shiftPeriodKey(cursor, period, -1);
  }

  // 历史最长:相邻键若正好差一个周期则连成一段
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of keys) {
    run = prev !== null && shiftPeriodKey(prev, period, 1) === key ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = key;
  }

  const recentCount = period === "weekly" ? 12 : 28;
  const recent: PeriodCell[] = [];
  for (let i = recentCount - 1; i >= 0; i--) {
    const key = shiftPeriodKey(currentKey, period, -i);
    recent.push({ key, count: counts.get(key) ?? 0 });
  }

  return {
    streak,
    longest,
    checkedPeriods: keys.length,
    elapsedPeriods,
    consistency: Math.min(100, Math.round((keys.length / elapsedPeriods) * 100)),
    recent,
    doneThisPeriod: (counts.get(currentKey) ?? 0) > 0,
  };
}
