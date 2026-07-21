import type { Goal, ProgressRecord } from "@/types/goal";
import { isComplete } from "@/utils/progress";
import { streak } from "@/utils/stats";

export interface Badge {
  id: string;
  icon: string;
  title: string;
  desc: string;
  unlocked: boolean;
}

/** Derived from live data — never stored (consistent with the stats philosophy). */
export function achievements(goals: Goal[], history: ProgressRecord[]): Badge[] {
  const active = goals.filter((g) => !g.archived);
  const completed = active.filter(isComplete).length;
  const checkIns = history.filter((r) => r.value > 0).length;
  const st = streak(history);
  return [
    { id: "first-goal", icon: "🌱", title: "启程", desc: "创建第一个目标", unlocked: active.length >= 1 },
    { id: "first-done", icon: "🎯", title: "首次达成", desc: "完成一个目标", unlocked: completed >= 1 },
    { id: "streak-7", icon: "🔥", title: "七日之约", desc: "连续打卡 7 天", unlocked: st >= 7 },
    { id: "ten-goals", icon: "🎢", title: "多线并进", desc: "同时拥有 10 个目标", unlocked: active.length >= 10 },
    { id: "hundred-records", icon: "💯", title: "百次坚持", desc: "累计打卡 100 次", unlocked: checkIns >= 100 },
  ];
}
