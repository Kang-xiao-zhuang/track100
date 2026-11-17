import type { Goal, ProgressRecord } from "@/types/goal";
import { isComplete, isHabit } from "@/utils/progress";
import { pace } from "@/utils/pace";

const DAY = 86400000;
/** 预测完成日与计划日相差在这个范围内,视为「按计划」,避免角标来回跳。 */
const ONTIME_TOLERANCE = 2;
/** 无截止日的目标:连续这么久没有正向打卡才提示沉寂。 */
const IDLE_DAYS = 7;

export type RhythmState = "ahead" | "ontime" | "behind" | "idle";

export interface Rhythm {
  state: RhythmState;
  /** 领先/落后天数(按计划时为偏差绝对值),仅设了 endDate 时存在。 */
  days?: number;
  /** 距上次正向打卡的天数,仅 idle 时存在。 */
  idleDays?: number;
}

/**
 * 卡片上的节奏提醒,全部实时推导、不存储。
 *
 * 两种口径:
 * - 设了 endDate:用 pace() 的平均速度预测完成日,与计划日比较,±2 天以内算按计划
 * - 未设 endDate:没有「计划」可比,只看多久没打卡,≥7 天才提示,避免制造噪音
 *
 * 已完成的返回 null(卡片本身已有 ✓);习惯型也返回 null——
 * 习惯卡片已经展示连击与坚持率,再叠加节奏角标只会重复。
 */
export function goalRhythm(goal: Goal, records: ProgressRecord[], now = Date.now()): Rhythm | null {
  if (isHabit(goal)) return null;
  if (isComplete(goal)) return null;

  const projection = pace(goal, records, now);
  if (goal.endDate && projection && projection.aheadDays !== null) {
    const ahead = projection.aheadDays;
    if (ahead > ONTIME_TOLERANCE) return { state: "ahead", days: ahead };
    if (ahead < -ONTIME_TOLERANCE) return { state: "behind", days: -ahead };
    return { state: "ontime", days: Math.abs(ahead) };
  }

  // records 由 store 保证倒序(新的在前),第一条正向记录就是最近一次打卡
  const last = records.find((r) => r.value > 0);
  if (!last) return null;
  const idleDays = Math.floor((now - new Date(last.createdAt).getTime()) / DAY);
  if (idleDays >= IDLE_DAYS) return { state: "idle", idleDays };
  return null;
}
