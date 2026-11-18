/**
 * 每日提醒的排程计算(纯函数,便于单测)。
 *
 * 为什么不用插件的 `schedule.on` (cron):Capacitor 6 在「精确闹钟未授权」时,
 * cron 通知触发后的自动重排会退化成 alarmManager.set(RTC, ...) —— 非唤醒、无 Doze 豁免,
 * 手机休眠时可能延迟甚至不响。改为一次排好未来 N 天的 `at` 通知,
 * 每条都走 setExactIfPossible(降级仍是 setAndAllowWhileIdle / RTC_WAKEUP),到达率高得多。
 * App 每次回前台再补齐被系统清掉或用掉的名额。
 *
 * 支持多个时段(早/晚):每个时段占用独立的 ID 段,互不覆盖。
 */

export const REMINDER_ID_BASE = 9200;
export const REMINDER_DAYS = 14;
export const TEST_NOTIFICATION_ID = 9299;
/** 最多 3 个提醒时段(早/午/晚)。 */
export const MAX_REMINDER_SLOTS = 3;

/** 第 slot 个时段占用的 14 个 ID(段与段之间留 2 个空位,便于将来扩展)。 */
export function reminderIds(slot = 0): number[] {
  const base = REMINDER_ID_BASE + slot * (REMINDER_DAYS + 2);
  return Array.from({ length: REMINDER_DAYS }, (_, i) => base + i);
}

/** 所有时段占用的 ID(取消时用)。 */
export function allReminderIds(): number[] {
  return Array.from({ length: MAX_REMINDER_SLOTS }, (_, s) => reminderIds(s)).flat();
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

/** 归一化时段列表:去空、去重、排序、限长;至少返回一个默认时段。 */
export function normalizeReminderTimes(times: string[] | undefined | null): string[] {
  const valid = (times ?? [])
    .filter((t) => /^\d{1,2}:\d{2}$/.test(t))
    .map((t) => {
      const [h, m] = t.split(":").map(Number);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    });
  const unique = [...new Set(valid)].sort();
  return (unique.length ? unique : ["20:00"]).slice(0, MAX_REMINDER_SLOTS);
}

export interface ReminderScheduleRecord {
  /** 当前排程的时段列表。旧记录无此字段,用 time 兜底。 */
  times?: string[];
  /** 单时段记录(旧版必有;新版等于 times[0])。 */
  time?: string;
  lang: string;
  ids: number[];
  scheduledAt: number;
}

const WEEK = 7 * 86400000;

/** 设置变化(时段/语言)、从未排过、或超过一周未重排 → 需要重新排程。 */
export function isScheduleStale(
  rec: ReminderScheduleRecord | null,
  times: string[] | string,
  lang: string,
  now = Date.now(),
): boolean {
  if (!rec) return true;
  const recTimes = rec.times ?? (rec.time ? [rec.time] : []);
  if (!Array.isArray(recTimes) || recTimes.length === 0) return true;
  const incoming = Array.isArray(times) ? times : [times];
  if (normalizeReminderTimes(recTimes).join(",") !== normalizeReminderTimes(incoming).join(",")) return true;
  if (rec.lang !== lang) return true;
  if (!Number.isFinite(rec.scheduledAt) || now - rec.scheduledAt > WEEK) return true;
  if (!Array.isArray(rec.ids) || rec.ids.length === 0) return true;
  return false;
}

/** pending 里的提醒快用完时也应补齐(系统清理 / 长时间未打开 App)。 */
export const MIN_PENDING = 3;
