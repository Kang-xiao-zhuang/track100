import { describe, expect, it } from "vitest";
import { cellsLit, fmt, isComplete, isHabit, isPinned, percent, ratio, remaining, shortcutGoals, sortGoals } from "@/utils/progress";
import { makeGoal } from "./fixtures";

describe("progress", () => {
  it("ratio 限制在 0..1,target<=0 时为 0", () => {
    expect(ratio(50, 100)).toBe(0.5);
    expect(ratio(150, 100)).toBe(1);
    expect(ratio(-5, 100)).toBe(0);
    expect(ratio(5, 0)).toBe(0);
  });

  it("percent 四舍五入,cellsLit 向下取整(没满 1% 不亮格)", () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(2, 3)).toBe(67);
    expect(cellsLit(2, 3)).toBe(66);
    expect(cellsLit(499, 500)).toBe(99);
    expect(cellsLit(500, 500)).toBe(100);
  });

  it("isComplete / remaining", () => {
    expect(isComplete(makeGoal({ current: 100 }))).toBe(true);
    expect(isComplete(makeGoal({ current: 99 }))).toBe(false);
    expect(remaining(makeGoal({ current: 30 }))).toBe(70);
    expect(remaining(makeGoal({ current: 120 }))).toBe(0);
  });

  it("fmt 去掉多余的 .0", () => {
    expect(fmt(72)).toBe("72");
    expect(fmt(72.5)).toBe("72.5");
    expect(fmt(1 / 3)).toBe("0.3");
  });
});

describe("shortcutGoals", () => {
  it("排除归档和已完成,按最近更新排序并截断", () => {
    const goals = [
      makeGoal({ id: "old", updatedAt: "2026-11-01T00:00:00Z" }),
      makeGoal({ id: "done", current: 100, updatedAt: "2026-11-09T00:00:00Z" }),
      makeGoal({ id: "archived", archived: true, updatedAt: "2026-11-09T00:00:00Z" }),
      makeGoal({ id: "new", updatedAt: "2026-11-05T00:00:00Z" }),
      makeGoal({ id: "mid", updatedAt: "2026-11-03T00:00:00Z" }),
    ];
    expect(shortcutGoals(goals, 2).map((g) => g.id)).toEqual(["new", "mid"]);
  });
});

describe("目标类型与首页排序", () => {
  it("旧数据(无 type)视为累计型,order 为负表示置顶", () => {
    expect(isHabit(makeGoal())).toBe(false);
    expect(isHabit(makeGoal({ type: "habit" }))).toBe(true);
    expect(isPinned(makeGoal())).toBe(false);
    expect(isPinned(makeGoal({ order: -1 }))).toBe(true);
  });

  it("sortGoals 按 order 升序,未设置的保持原顺序(稳定)", () => {
    const goals = [
      makeGoal({ id: "a" }),
      makeGoal({ id: "b", order: 5 }),
      makeGoal({ id: "c", order: -1 }),
      makeGoal({ id: "d" }),
    ];
    expect(sortGoals(goals).map((g) => g.id)).toEqual(["c", "a", "d", "b"]);
    expect(goals.map((g) => g.id)).toEqual(["a", "b", "c", "d"]); // 不修改入参
  });
});
