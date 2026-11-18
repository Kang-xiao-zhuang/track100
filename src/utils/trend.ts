import type { Goal, ProgressRecord } from "@/types/goal";
import { dayKey } from "@/utils/date";

export interface TrendPoint {
  /** 本地日期键 YYYY-MM-DD */
  date: string;
  /** 当天累计值(clamp 到 0..target) */
  value: number;
  /** 当天累计完成百分比 0..100 */
  pct: number;
}

/**
 * 单个目标的累计完成曲线:按天聚合正向 + 负向记录,得到每天的净累计值。
 * 只统计真实打卡记录(含撤销的负记录),按本地日期升序。
 * 从 0 开始累加;若首条记录之前目标已有 current(旧数据),用 initial 作为起点。
 */
export function goalTrend(records: ProgressRecord[], target: number, initial = 0): TrendPoint[] {
  const byDay = new Map<string, number>();
  for (const r of records) {
    const key = dayKey(r.createdAt);
    byDay.set(key, (byDay.get(key) ?? 0) + r.value);
  }
  const days = [...byDay.keys()].sort();
  let running = initial;
  const points: TrendPoint[] = [];
  for (const date of days) {
    running = Math.min(target, Math.max(0, running + byDay.get(date)!));
    points.push({ date, value: running, pct: target > 0 ? Math.round((running / target) * 100) : 0 });
  }
  return points;
}

/** 图表 X 轴短标签:MM-DD。 */
export function shortDay(date: string): string {
  return date.slice(5);
}
