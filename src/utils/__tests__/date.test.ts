import { describe, expect, it } from "vitest";
import { dayKey, formatDateTime } from "@/utils/date";

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
