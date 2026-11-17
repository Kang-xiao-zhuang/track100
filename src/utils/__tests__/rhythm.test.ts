import { describe, expect, it } from "vitest";
import { goalRhythm } from "@/utils/rhythm";
import { makeGoal, rec } from "@/utils/__tests__/fixtures";

const NOW = new Date("2026-11-11T00:00:00.000Z").getTime();
const days = (n: number) => new Date(NOW + n * 86400000).toISOString();

describe("goalRhythm", () => {
  it("已完成返回 null", () => {
    const goal = makeGoal({ current: 100, endDate: days(10) });
    expect(goalRhythm(goal, [rec(days(-5))], NOW)).toBeNull();
  });

  it("习惯型返回 null(卡片已有连击)", () => {
    const goal = makeGoal({ type: "habit", habitPeriod: "daily", current: 3 });
    expect(goalRhythm(goal, [rec(days(-1))], NOW)).toBeNull();
  });

  it("设了截止日且会提前完成 → ahead", () => {
    // 10 天推进 50,预计 20 号后的 10 天完成(11-21),计划 11-30 → 领先 9 天
    const goal = makeGoal({ current: 50, endDate: days(19) });
    expect(goalRhythm(goal, [rec(days(-9), 1)], NOW)).toEqual({ state: "ahead", days: 9 });
  });

  it("设了截止日且会推迟 → behind", () => {
    const goal = makeGoal({ current: 50, endDate: days(4) }); // 计划 11-15,预计 11-21
    expect(goalRhythm(goal, [rec(days(-9), 1)], NOW)).toEqual({ state: "behind", days: 6 });
  });

  it("偏差在 ±2 天内 → ontime", () => {
    const goal = makeGoal({ current: 50, endDate: days(11) }); // 计划 11-22,预计 11-21
    expect(goalRhythm(goal, [rec(days(-9), 1)], NOW)).toEqual({ state: "ontime", days: 1 });
  });

  it("未设截止日,≥7 天没打卡 → idle", () => {
    const goal = makeGoal({ current: 5 });
    expect(goalRhythm(goal, [rec(days(-8), 1)], NOW)).toEqual({ state: "idle", idleDays: 8 });
  });

  it("未设截止日,最近打过卡 → null(不制造噪音)", () => {
    const goal = makeGoal({ current: 5 });
    expect(goalRhythm(goal, [rec(days(-3), 1)], NOW)).toBeNull();
  });

  it("没有任何正向记录 → null", () => {
    const goal = makeGoal({ current: 0 });
    expect(goalRhythm(goal, [], NOW)).toBeNull();
  });

  it("只看正向记录,负向记录不算最近打卡", () => {
    const goal = makeGoal({ current: 5 });
    const negative = { ...rec(days(-1), -2), value: -2 };
    expect(goalRhythm(goal, [negative, rec(days(-10), 1)], NOW)).toEqual({ state: "idle", idleDays: 10 });
  });
});
