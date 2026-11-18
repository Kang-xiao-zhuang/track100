import { describe, expect, it } from "vitest";
import { goalTrend, shortDay } from "@/utils/trend";
import { rec } from "./fixtures";

describe("goalTrend", () => {
  it("按天累计并 clamp 到 target", () => {
    // 北京时区:04:00Z = 12:00 本地
    const records = [
      rec("2026-11-01T04:00:00Z", 30),
      rec("2026-11-02T04:00:00Z", 50),
      rec("2026-11-03T04:00:00Z", 50), // 累计 130 → clamp 100
    ];
    const out = goalTrend(records, 100);
    expect(out.map((p) => p.value)).toEqual([30, 80, 100]);
    expect(out.map((p) => p.pct)).toEqual([30, 80, 100]);
  });

  it("同一天多条记录合并", () => {
    const records = [
      rec("2026-11-01T01:00:00Z", 10),
      rec("2026-11-01T09:00:00Z", 15),
    ];
    expect(goalTrend(records, 100)).toEqual([{ date: "2026-11-01", value: 25, pct: 25 }]);
  });

  it("负向记录(撤销)扣减累计", () => {
    const records = [
      rec("2026-11-01T04:00:00Z", 40),
      rec("2026-11-02T04:00:00Z", -10),
    ];
    expect(goalTrend(records, 100).map((p) => p.value)).toEqual([40, 30]);
  });

  it("从 initial 起步,兼容旧数据已有进度", () => {
    const records = [rec("2026-11-01T04:00:00Z", 10)];
    expect(goalTrend(records, 100, 20)[0].value).toBe(30);
  });

  it("空记录返回空数组", () => {
    expect(goalTrend([], 100)).toEqual([]);
  });
});

describe("shortDay", () => {
  it("截取 MM-DD", () => {
    expect(shortDay("2026-11-03")).toBe("11-03");
  });
});
