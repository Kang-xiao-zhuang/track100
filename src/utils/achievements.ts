import type { Goal, ProgressRecord } from "@/types/goal";
import { isComplete } from "@/utils/progress";
import { streak } from "@/utils/stats";

export interface Badge {
  /** matches i18n keys b.<id>.t / b.<id>.d */
  id: string;
  icon: string;
  unlocked: boolean;
}

/** Derived from live data — never stored (consistent with the stats philosophy). */
export function achievements(goals: Goal[], history: ProgressRecord[]): Badge[] {
  const active = goals.filter((g) => !g.archived && !g.deletedAt);
  const completed = active.filter(isComplete).length;
  const checkIns = history.filter((r) => r.value > 0).length;
  const st = streak(history);
  return [
    { id: "firstGoal", icon: "🌱", unlocked: active.length >= 1 },
    { id: "firstDone", icon: "🎯", unlocked: completed >= 1 },
    { id: "streak7", icon: "🔥", unlocked: st >= 7 },
    { id: "tenGoals", icon: "🎢", unlocked: active.length >= 10 },
    { id: "hundred", icon: "💯", unlocked: checkIns >= 100 },
  ];
}
