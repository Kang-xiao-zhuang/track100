import type { Goal, ProgressRecord } from "@/types/goal";
import { dayKey } from "@/utils/date";
import { isComplete } from "@/utils/progress";

const DAY = 86400000;

function localMidnight(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function nextDayKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 1);
  return dayKey(dt);
}

/** 首次使用日：最早的目标创建时间或打卡时间；无数据返回 null。 */
export function firstUseDay(goals: Goal[], history: ProgressRecord[]): Date | null {
  const times = [
    ...goals.map((g) => new Date(g.createdAt).getTime()),
    ...history.map((r) => new Date(r.createdAt).getTime()),
  ].filter((t) => Number.isFinite(t));
  return times.length ? new Date(Math.min(...times)) : null;
}

/** 从首次使用到今天第几天（含今天，至少 1）；无数据返回 0 以便 UI 隐藏。 */
export function journeyDay(goals: Goal[], history: ProgressRecord[], now: Date = new Date()): number {
  const first = firstUseDay(goals, history);
  if (!first) return 0;
  return Math.max(1, Math.floor((localMidnight(now) - localMidnight(first)) / DAY) + 1);
}

/** 历史最长连续打卡天数（正向记录，按本地日期）。 */
export function bestStreak(history: ProgressRecord[]): number {
  const days = [...new Set(history.filter((r) => r.value > 0).map((r) => dayKey(r.createdAt)))].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of days) {
    run = prev !== null && nextDayKey(prev) === key ? run + 1 : 1;
    best = Math.max(best, run);
    prev = key;
  }
  return best;
}

export interface WeeklySummary {
  checkIns: number;
  cells: number;
  activeDays: number;
  topGoal: { goalId: string; title: string; icon: string; color: string; count: number } | null;
}

/** 本周（周一为起点）小结：打卡次数、点亮格子、活跃天数、最活跃目标。 */
export function weeklySummary(
  goals: Goal[],
  history: ProgressRecord[],
  now: Date = new Date(),
): WeeklySummary {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mondayOffset = (today.getDay() + 6) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() - mondayOffset);
  const startKey = dayKey(start);

  const inWeek = history.filter((r) => r.value > 0 && dayKey(r.createdAt) >= startKey);
  const days = new Set<string>();
  const byGoal = new Map<string, number>();
  let cells = 0;
  for (const r of inWeek) {
    cells += r.value;
    days.add(dayKey(r.createdAt));
    byGoal.set(r.goalId, (byGoal.get(r.goalId) ?? 0) + 1);
  }
  const top = [...byGoal.entries()].sort((a, b) => b[1] - a[1])[0];
  const topGoal = top ? (() => {
    const g = goals.find((x) => x.id === top[0]);
    return g ? { goalId: g.id, title: g.title, icon: g.icon, color: g.color, count: top[1] } : null;
  })() : null;
  return { checkIns: inWeek.length, cells, activeDays: days.size, topGoal };
}

export interface TopGoal {
  goal: Goal;
  count: number;
  cells: number;
}

/** 打卡次数最多的目标（用于统计页排行）。 */
export function topGoalsByCheckins(goals: Goal[], history: ProgressRecord[], limit = 3): TopGoal[] {
  const map = new Map<string, { count: number; cells: number }>();
  for (const r of history) {
    if (r.value <= 0) continue;
    const cur = map.get(r.goalId) ?? { count: 0, cells: 0 };
    cur.count++;
    cur.cells += r.value;
    map.set(r.goalId, cur);
  }
  return goals
    .filter((g) => !g.archived && !g.deletedAt)
    .map((g) => ({ goal: g, count: map.get(g.id)?.count ?? 0, cells: map.get(g.id)?.cells ?? 0 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** 今天该目标是否已打卡（补打卡归属按记录日期）。 */
export function checkedToday(records: ProgressRecord[], now: Date = new Date()): boolean {
  const key = dayKey(now);
  return records.some((r) => r.value > 0 && dayKey(r.createdAt) === key);
}

/** 今日尚未打卡的进行中目标（一键全打卡用）。 */
export function goalsPendingToday(goals: Goal[], history: ProgressRecord[], now: Date = new Date()): Goal[] {
  const key = dayKey(now);
  const checked = new Set(
    history.filter((r) => r.value > 0 && dayKey(r.createdAt) === key).map((r) => r.goalId),
  );
  return goals.filter((g) => !g.archived && !g.deletedAt && !isComplete(g) && !checked.has(g.id));
}
