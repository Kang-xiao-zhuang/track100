import type { Goal, ProgressRecord } from "@/types/goal";
import { isComplete } from "@/utils/progress";
import { dayKey } from "@/utils/date";

/**
 * 通知栏「打卡 +1」作用于哪个目标:
 * 只看可见且未完成的目标;优先今天还没有正向打卡记录的,按最近更新排序。
 * 若所有目标今天都已打卡,返回 null —— 宁可提示,也不误加。
 * 每次点击时实时计算,避免定时通知里写死 goalId 后过期。
 */
export function pickCheckinGoal(goals: Goal[], history: ProgressRecord[], now = new Date()): Goal | null {
  const candidates = goals.filter((g) => !g.archived && !g.deletedAt && !isComplete(g));
  if (candidates.length === 0) return null;

  const today = dayKey(now);
  const checkedToday = new Set(
    history.filter((r) => r.value > 0 && dayKey(r.createdAt) === today).map((r) => r.goalId),
  );
  const pending = candidates.filter((g) => !checkedToday.has(g.id));
  if (pending.length === 0) return null;

  return [...pending].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}
