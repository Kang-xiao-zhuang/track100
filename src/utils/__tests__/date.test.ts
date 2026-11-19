import { describe, expect, it } from "vitest";
import { dayKey, formatDateTime, yearProgress } from "@/utils/date";

// vitest.config 固定 TZ=Asia/Shanghai(UTC+8)
describe("dayKey", () => {
  it("按本地日期分天:UTC 前一天 23:30 = 北京时间当天 07:30", () => {
    expect(dayKey("2026-11-02T23:30:00.000Z")).toBe("2026-11-03");
  });
  it("接受 Date 对象并补零", () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("formatDateTime", () => {
  it("显示本地时间而不是 UTC", () => {
    expect(formatDateTime("2026-11-03T02:04:00.000Z")).toBe("2026-11-03 10:04");
  });
});

describe("yearProgress", () => {
  it("平年:11-19 是第 323 天,还剩 42 天", () => {
    expect(yearProgress(new Date(2026, 10, 19))).toEqual({
      dayOfYear: 323, daysLeft: 42, totalDays: 365, year: 2026,
    });
  });
  it("年初:1-1 是第 1 天,还剩 364 天", () => {
    expect(yearProgress(new Date(2026, 0, 1))).toEqual({
      dayOfYear: 1, daysLeft: 364, totalDays: 365, year: 2026,
    });
  });
  it("年末:12-31 剩 0 天", () => {
    const p = yearProgress(new Date(2026, 11, 31));
    expect(p.dayOfYear).toBe(365);
    expect(p.daysLeft).toBe(0);
  });
  it("闰年:总天数 366,3-1 是第 61 天", () => {
    const p = yearProgress(new Date(2024, 2, 1));
    expect(p.totalDays).toBe(366);
    expect(p.dayOfYear).toBe(61);
    expect(p.daysLeft).toBe(305);
  });
});
