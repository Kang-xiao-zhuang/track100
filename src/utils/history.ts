import type { ProgressRecord } from "@/types/goal";

/** 新的在前。createdAt 是 ISO 字符串,字典序即时间序。 */
export function sortNewestFirst(records: ProgressRecord[]): ProgressRecord[] {
  return [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 按目标分组,保持输入顺序(输入已是新的在前,则每组也是)。 */
export function indexByGoal(records: ProgressRecord[]): Record<string, ProgressRecord[]> {
  const index: Record<string, ProgressRecord[]> = {};
  for (const r of records) (index[r.goalId] ??= []).push(r);
  return index;
}
