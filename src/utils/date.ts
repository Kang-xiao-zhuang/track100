// 记录里的 createdAt 是 UTC ISO 字符串;按「天」分组和显示时间都必须换算成本地时间,
// 否则 UTC+8 的早上 8 点前打卡会被算到前一天。

const pad = (n: number) => String(n).padStart(2, "0");

/** 本地日期键 "YYYY-MM-DD"。 */
export function dayKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 本地时间 "YYYY-MM-DD HH:mm",用于打卡记录列表。 */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${dayKey(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface YearProgress {
  /** 今天是今年第几天(1-based,1 月 1 日为 1)。 */
  dayOfYear: number;
  /** 今年还剩几天(不含今天,12 月 31 日为 0)。 */
  daysLeft: number;
  /** 今年总天数(平年 365/闰年 366)。 */
  totalDays: number;
  year: number;
}

/** 年度进度:按本地时间算今天是第几天、还剩几天,自动处理闰年。 */
export function yearProgress(now: Date = new Date()): YearProgress {
  const year = now.getFullYear();
  const start = new Date(year, 0, 1).getTime();
  const today = new Date(year, now.getMonth(), now.getDate()).getTime();
  const nextStart = new Date(year + 1, 0, 1).getTime();
  const totalDays = Math.round((nextStart - start) / 86400000);
  const dayOfYear = Math.round((today - start) / 86400000) + 1;
  return { dayOfYear, daysLeft: totalDays - dayOfYear, totalDays, year };
}
