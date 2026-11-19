import type { Goal, GoalCategory, ProgressRecord } from "@/types/goal";
import { isComplete } from "@/utils/progress";
import { dayKey } from "@/utils/date";
import { streak } from "@/utils/stats";
import { shiftPeriodKey } from "@/utils/habit";

export interface Badge {
  /** matches i18n keys b.<id>.t / b.<id>.d */
  id: string;
  icon: string;
  unlocked: boolean;
  /** 进度(current/target)用于成就卡片上的小进度条;无则为里程碑型成就。 */
  current?: number;
  target?: number;
}

/** 从全部正向打卡计算历史最长连续天数。 */
function longestStreak(history: ProgressRecord[]): number {
  const days = [...new Set(history.filter((r) => r.value > 0).map((r) => dayKey(r.createdAt)))].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of days) {
    run = prev !== null && shiftPeriodKey(prev, "daily", 1) === key ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = key;
  }
  return longest;
}

/**
 * 成就由实时数据派生,从不落盘(与统计同一哲学)。
 * 维度:起步、完成、连击、规模、时段、专注、纯粹度。
 */
export function achievements(goals: Goal[], history: ProgressRecord[]): Badge[] {
  const active = goals.filter((g) => !g.archived && !g.deletedAt);
  const completed = active.filter(isComplete).length;
  const checkIns = history.filter((r) => r.value > 0);
  const checkInCount = checkIns.length;
  const st = streak(history);
  const best = longestStreak(history);
  // 历史累计活跃天数(去重)—— 时间型里程碑的口径,断签也不会倒退。
  const activeDays = new Set(history.filter((r) => r.value > 0).map((r) => dayKey(r.createdAt))).size;

  // 时段:按本地时间的打卡分布
  let early = 0;
  let night = 0;
  for (const r of checkIns) {
    const h = new Date(r.createdAt).getHours();
    if (h >= 5 && h <= 8) early++;
    if (h >= 22 || h < 2) night++;
  }

  // 专注:覆盖了多少个分类(有目标)
  const cats = new Set<GoalCategory>(active.map((g) => g.category));
  // 纯粹度:补打卡数量
  const backfilled = checkIns.filter((r) => r.backfilled).length;

  return [
    { id: "firstGoal", icon: "🌱", unlocked: active.length >= 1, current: active.length, target: 1 },
    { id: "firstDone", icon: "🎯", unlocked: completed >= 1, current: completed, target: 1 },
    { id: "streak7", icon: "🔥", unlocked: st >= 7, current: st, target: 7 },
    { id: "streak30", icon: "🏆", unlocked: best >= 30, current: best, target: 30 },
    { id: "tenGoals", icon: "🎢", unlocked: active.length >= 10, current: active.length, target: 10 },
    { id: "hundred", icon: "💯", unlocked: checkInCount >= 100, current: checkInCount, target: 100 },
    { id: "fiveHundred", icon: "🏅", unlocked: checkInCount >= 500, current: checkInCount, target: 500 },
    { id: "earlyBird", icon: "🌅", unlocked: early >= 20, current: early, target: 20 },
    { id: "nightOwl", icon: "🦉", unlocked: night >= 20, current: night, target: 20 },
    { id: "allRounder", icon: "🎨", unlocked: cats.size >= 5, current: cats.size, target: 5 },
    { id: "noBackfill", icon: "⏱️", unlocked: checkInCount >= 50 && backfilled === 0 },
    { id: "completeFive", icon: "🎖️", unlocked: completed >= 5, current: completed, target: 5 },
    // 时间型长期里程碑:累计活跃 30/100/365 天,断签不倒退,给长期坚持一个持续的目标。
    { id: "days30", icon: "🗓️", unlocked: activeDays >= 30, current: activeDays, target: 30 },
    { id: "days100", icon: "💎", unlocked: activeDays >= 100, current: activeDays, target: 100 },
    { id: "days365", icon: "👑", unlocked: activeDays >= 365, current: activeDays, target: 365 },
  ];
}
