import type { ProgressRecord } from "@/types/goal";

/** 本地日期 key,避免 ISO 的 UTC 日期把晚上 23 点的打卡算到第二天。 */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function checkedDays(history: ProgressRecord[]): Set<string> {
  return new Set(
    history
      .filter((r) => r.value > 0)
      .map((r) => new Date(r.createdAt))
      .filter((d) => !Number.isNaN(d.getTime()))
      .map(dayKey),
  );
}

/**
 * 当前连续打卡天数。今天还没打卡时从昨天往前数(早上不打击人),
 * 只有昨天也没有才归零。补打卡按记录时间归属当天,算作那天有打卡。
 */
export function currentStreak(history: ProgressRecord[], now: Date = new Date()): number {
  const days = checkedDays(history);
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** 今天的打卡次数(补打卡时间不在今天则不计入)。 */
export function todayCheckIns(history: ProgressRecord[], now: Date = new Date()): number {
  const today = dayKey(now);
  return history.filter((r) => r.value > 0 && dayKey(new Date(r.createdAt)) === today).length;
}
