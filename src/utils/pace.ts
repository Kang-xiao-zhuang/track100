import type { Goal, ProgressRecord } from "@/types/goal";

const DAY = 86400000;

export interface Pace {
  perDay: number; // 平均每天推进(单位/天)
  projectedDate: Date | null; // 预计完成日(已完成或无法预测时为 null)
  aheadDays: number | null; // 相对 endDate:正=领先(会提前完成),负=落后
  done: boolean;
}

/**
 * 按「创建到现在」的平均速度预测完成日;若设了 endDate 再算领先/落后天数。
 * 返回 null = 还没数据可预测(没打卡)。全部实时推导,不存储。
 */
export function pace(goal: Goal, records: ProgressRecord[]): Pace | null {
  if (goal.current >= goal.target) {
    return { perDay: 0, projectedDate: null, aheadDays: null, done: true };
  }
  const checkins = records.filter((r) => r.value > 0);
  if (goal.current <= 0 || checkins.length === 0) return null;

  // 起点取「创建时间」与「最早一次打卡」中较早者
  const times = checkins.map((r) => new Date(r.createdAt).getTime());
  const start = Math.min(new Date(goal.createdAt).getTime(), ...times);
  const spanDays = Math.max(0.5, (Date.now() - start) / DAY);
  const perDay = goal.current / spanDays;
  if (perDay <= 0) return null;

  const remaining = goal.target - goal.current;
  const projectedDate = new Date(Date.now() + (remaining / perDay) * DAY);

  let aheadDays: number | null = null;
  if (goal.endDate) {
    aheadDays = Math.round((new Date(goal.endDate).getTime() - projectedDate.getTime()) / DAY);
  }
  return { perDay, projectedDate, aheadDays, done: false };
}

export function formatDate(d: Date, lang: "zh" | "en"): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return lang === "zh" ? `${y} 年 ${m} 月 ${day} 日` : `${d.toLocaleString("en", { month: "short" })} ${day}, ${y}`;
}
