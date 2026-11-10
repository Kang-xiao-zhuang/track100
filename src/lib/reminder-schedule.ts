/**
 * 每日提醒的排程计算(纯函数,便于单测)。
 *
 * 为什么不用插件的 `schedule.on` (cron):Capacitor 6 在「精确闹钟未授权」时,
 * cron 通知触发后的自动重排会退化成 alarmManager.set(RTC, ...) —— 非唤醒、无 Doze 豁免,
 * 手机休眠时可能延迟甚至不响。改为一次排好未来 N 天的 `at` 通知,
 * 每条都走 setExactIfPossible(降级仍是 setAndAllowWhileIdle / RTC_WAKEUP),到达率高得多。
 * App 每次回前台再补齐被系统清掉或用掉的名额。
 */

export const REMINDER_ID_BASE = 9200;
export const REMINDER_DAYS = 14;
export const TEST_NOTIFICATION_ID = 9299;

export function reminderIds(): number[] {
  return Array.from({ length: REMINDER_DAYS }, (_, i) => REMINDER_ID_BASE + i);
}

/** 解析 "HH:mm",非法输入退回 20:00。 */
export function parseReminderTime(time: string): { hour: number; minute: number } {
  const [h, m] = (time ?? "").split(":").map(Number);
  return {
    hour: Number.isFinite(h) ? Math.min(23, Math.max(0, Math.trunc(h))) : 20,
    minute: Number.isFinite(m) ? Math.min(59, Math.max(0, Math.trunc(m))) : 0,
  };
}

/** 从今天起生成未来 days 天同一本地时刻;若今天的时刻已过,从明天开始。 */
export function nextTriggerSlots(time: string, now: Date, days = REMINDER_DAYS): Date[] {
  const { hour, minute } = parseReminderTime(time);
  const out: Date[] = [];
  for (let i = 0; out.length < days && i <= days; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hour, minute, 0, 0);
    if (d.getTime() <= now.getTime()) continue;
    out.push(d);
  }
  return out;
}

export interface ReminderScheduleRecord {
  time: string;
  lang: string;
  ids: number[];
  scheduledAt: number;
}

const WEEK = 7 * 86400000;

/** 设置变化(时间/语言)、从未排过、或超过一周未重排 → 需要重新排程。 */
export function isScheduleStale(
  rec: ReminderScheduleRecord | null,
  time: string,
  lang: string,
  now = Date.now(),
): boolean {
  if (!rec || !Array.isArray(rec.ids) || rec.ids.length === 0) return true;
  if (rec.time !== time || rec.lang !== lang) return true;
  if (!Number.isFinite(rec.scheduledAt) || now - rec.scheduledAt > WEEK) return true;
  return false;
}

/** pending 里的提醒快用完时也应补齐(系统清理 / 长时间未打开 App)。 */
export const MIN_PENDING = 3;
