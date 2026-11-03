import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { byCategory, dailyCounts, overview, streak } from "@/utils/stats";
import { achievements } from "@/utils/achievements";
import { makeGoal, rec } from "./fixtures";

// 北京时间 2026-11-03 12:00
const NOW = new Date("2026-11-03T04:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe("streak", () => {
  it("没有记录为 0", () => {
    expect(streak([])).toBe(0);
  });

  it("连续三天(含今天)= 3", () => {
    const h = [rec("2026-11-03T01:00:00Z"), rec("2026-11-02T01:00:00Z"), rec("2026-11-01T01:00:00Z")];
    expect(streak(h)).toBe(3);
  });

  it("今天还没打卡但昨天打了,连续不断", () => {
    expect(streak([rec("2026-11-02T01:00:00Z"), rec("2026-11-01T01:00:00Z")])).toBe(2);
  });

  it("昨天和今天都没打卡则归零", () => {
    expect(streak([rec("2026-11-01T01:00:00Z")])).toBe(0);
  });

  it("北京时间早上 7 点打卡算今天(UTC 还是昨天)", () => {
    // 2026-11-02T23:00Z = 北京 11-03 07:00;另一条是北京 11-02 12:00
    const h = [rec("2026-11-02T23:00:00Z"), rec("2026-11-02T04:00:00Z")];
    expect(streak(h)).toBe(2);
  });

  it("撤销记录(负数)不算打卡", () => {
    expect(streak([rec("2026-11-03T01:00:00Z", -1)])).toBe(0);
  });
});

describe("dailyCounts", () => {
  it("返回最近 N 天,最后一天是今天(本地),只计正数记录", () => {
    const h = [rec("2026-11-02T23:00:00Z"), rec("2026-11-03T01:00:00Z"), rec("2026-11-03T02:00:00Z", -1)];
    const out = dailyCounts(h, 3);
    expect(out.map((d) => d.date)).toEqual(["11-01", "11-02", "11-03"]);
    expect(out.at(-1)!.count).toBe(2);
  });
});

describe("overview / byCategory / achievements", () => {
  const goals = [
    makeGoal({ id: "a", current: 100 }),
    makeGoal({ id: "b", category: "health" }),
    makeGoal({ id: "c", archived: true, current: 100 }),
  ];

  it("overview 忽略归档目标", () => {
    expect(overview(goals, [rec("2026-11-03T01:00:00Z")])).toEqual({
      totalGoals: 2,
      completedGoals: 1,
      activeGoals: 1,
      totalRecords: 1,
      completionRate: 50,
    });
  });

  it("byCategory 按数量降序,不含归档", () => {
    expect(byCategory([...goals, makeGoal({ id: "d", category: "health" })])).toEqual([
      { category: "health", count: 2 },
      { category: "learning", count: 1 },
    ]);
  });

  it("achievements 按数据推导解锁状态", () => {
    const unlocked = achievements(goals, []).filter((b) => b.unlocked).map((b) => b.id);
    expect(unlocked).toEqual(["firstGoal", "firstDone"]);
  });
});
