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
