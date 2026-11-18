import { describe, expect, it } from "vitest";
import { buildPeriodReview, canGoNext, periodWindow, shiftPeriod } from "@/utils/period-review";
import { makeGoal, rec } from "./fixtures";

// 2026-11-17 是周二(北京时区用本地时间,这里用 UTC 中午避免跨日)
const NOW = new Date("2026-11-17T12:00:00.000Z");
const ANCHOR = NOW;

describe("periodWindow", () => {
  it("周窗口覆盖周一到周日,7 个桶", () => {
    const w = periodWindow("week", ANCHOR, NOW);
    expect(w.startKey).toBe("2026-11-16"); // 周一
    expect(w.endKey).toBe("2026-11-22"); // 周日
    expect(w.buckets).toHaveLength(7);
  });

  it("月窗口覆盖当月全部天数", () => {
    const w = periodWindow("month", ANCHOR, NOW);
    expect(w.startKey).toBe("2026-11-01");
    expect(w.endKey).toBe("2026-11-30");
    expect(w.buckets).toHaveLength(30);
  });

  it("年窗口 12 个桶", () => {
    const w = periodWindow("year", ANCHOR, NOW);
    expect(w.startKey).toBe("2026-01-01");
    expect(w.endKey).toBe("2026-12-31");
    expect(w.buckets).toHaveLength(12);
  });
});

describe("shiftPeriod / canGoNext", () => {
  it("周平移 7 天", () => {
    const next = shiftPeriod("week", ANCHOR, 1);
    expect(periodWindow("week", next, NOW).startKey).toBe("2026-11-23");
  });

  it("月平移到下月 1 号", () => {
    const next = shiftPeriod("month", ANCHOR, 1);
    expect(next.getMonth()).toBe(11); // 12 月
    expect(next.getDate()).toBe(1);
  });

  it("不能越过当前周期", () => {
    expect(canGoNext("week", ANCHOR, NOW)).toBe(false);
    const past = shiftPeriod("week", ANCHOR, -1);
    expect(canGoNext("week", past, NOW)).toBe(true);
  });
});

describe("buildPeriodReview", () => {
  const goals = [makeGoal({ id: "g1", target: 100 })];

  it("只统计窗口内的正向记录", () => {
    const history = [
      rec("2026-11-16T04:00:00Z", 30), // 周一,窗口内
      rec("2026-11-17T04:00:00Z", 20), // 周二,窗口内
      rec("2026-11-10T04:00:00Z", 50), // 上周,窗口外
      rec("2026-11-17T05:00:00Z", -5), // 负向,不计
    ];
    const r = buildPeriodReview(goals, history, "week", ANCHOR, NOW);
    expect(r.checkIns).toBe(2);
    expect(r.litCells).toBe(50); // (30+20)/100*100
    expect(r.activeDays).toBe(2);
  });

  it("排除回收站目标的记录", () => {
    const deleted = [makeGoal({ id: "g1", target: 100, deletedAt: "2026-11-01T00:00:00Z" })];
    const history = [rec("2026-11-16T04:00:00Z", 30)];
    expect(buildPeriodReview(deleted, history, "week", ANCHOR, NOW).checkIns).toBe(0);
  });

  it("bestBucket 指向打卡最多的桶", () => {
    const history = [
      rec("2026-11-16T04:00:00Z", 1),
      rec("2026-11-16T05:00:00Z", 1),
      rec("2026-11-18T04:00:00Z", 1),
    ];
    const r = buildPeriodReview(goals, history, "week", ANCHOR, NOW);
    expect(r.bestBucket?.key).toBe("2026-11-16");
    expect(r.bestBucket?.count).toBe(2);
  });

  it("空数据 heat 仍有完整格子", () => {
    const r = buildPeriodReview(goals, [], "week", ANCHOR, NOW);
    expect(r.heat).toHaveLength(7);
    expect(r.heat.every((h) => h.count === 0)).toBe(true);
  });
});
