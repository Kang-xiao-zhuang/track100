import { describe, it, expect } from "vitest";
import type { Goal, ProgressRecord } from "@/types/goal";
import {
  bestStreak,
  checkedToday,
  firstUseDay,
  goalsPendingToday,
  journeyDay,
  topGoalsByCheckins,
  weeklySummary,
} from "../insights";

function goal(id: string, current = 0, target = 100): Goal {
  return {
    id,
    title: id,
    icon: "🌱",
    color: "#6E7F4F",
    category: "learning",
    unit: "times",
    target,
    current,
    step: 1,
    createdAt: "2026-01-01T02:00:00.000Z",
    updatedAt: "2026-01-01T02:00:00.000Z",
    archived: false,
  };
}

function rec(id: string, goalId: string, localIso: string, value = 1): ProgressRecord {
  return { id, goalId, value, createdAt: localIso };
}

describe("journey", () => {
  it("firstUseDay picks the earliest timestamp", () => {
    const g = [goal("a")];
    g[0].createdAt = "2026-03-10T02:00:00.000Z";
    const h = [rec("r", "a", "2026-03-05T02:00:00.000Z")];
    expect(firstUseDay(g, h)?.toISOString()).toBe("2026-03-05T02:00:00.000Z");
  });

  it("returns null with no data", () => {
    expect(firstUseDay([], [])).toBeNull();
    expect(journeyDay([], [])).toBe(0);
  });

  it("journeyDay counts inclusive days and never below 1", () => {
    const g = [goal("a")];
    g[0].createdAt = "2026-03-01T02:00:00.000Z";
    expect(journeyDay(g, [], new Date(2026, 2, 1))).toBe(1);
    expect(journeyDay(g, [], new Date(2026, 2, 5))).toBe(5);
    expect(journeyDay(g, [], new Date(2026, 1, 20))).toBe(1);
  });

  it("bestStreak handles gaps and multiple runs", () => {
    const h = [
      rec("1", "a", "2026-03-01T02:00:00.000Z"),
      rec("2", "a", "2026-03-02T02:00:00.000Z"),
      rec("3", "a", "2026-03-03T02:00:00.000Z"),
      rec("4", "a", "2026-03-08T02:00:00.000Z"),
      rec("5", "a", "2026-03-09T02:00:00.000Z"),
    ];
    expect(bestStreak(h)).toBe(3);
    expect(bestStreak([])).toBe(0);
  });
});

describe("weeklySummary", () => {
  const now = new Date(2026, 2, 11, 12); // 周三

  it("sums only this week (Monday start)", () => {
    const g = [goal("a"), goal("b")];
    const h = [
      rec("1", "a", "2026-03-09T02:00:00.000Z", 2), // 周一
      rec("2", "a", "2026-03-10T02:00:00.000Z", 1), // 周二
      rec("3", "b", "2026-03-11T02:00:00.000Z", 3), // 周三
      rec("4", "a", "2026-03-07T02:00:00.000Z", 5), // 上周六
    ];
    const s = weeklySummary(g, h, now);
    expect(s.checkIns).toBe(3);
    expect(s.cells).toBe(6);
    expect(s.activeDays).toBe(3);
    expect(s.topGoal?.goalId).toBe("a");
  });

  it("handles empty week", () => {
    const s = weeklySummary([goal("a")], [], now);
    expect(s).toEqual({ checkIns: 0, cells: 0, activeDays: 0, topGoal: null });
  });
});

describe("today helpers", () => {
  const now = new Date(2026, 2, 11, 12);

  it("checkedToday respects local day of the record", () => {
    expect(checkedToday([rec("1", "a", "2026-03-11T02:00:00.000Z")], now)).toBe(true);
    expect(checkedToday([rec("1", "a", "2026-03-10T02:00:00.000Z")], now)).toBe(false);
  });

  it("goalsPendingToday excludes checked, archived and completed", () => {
    const a = goal("a");
    const b = goal("b");
    const c = goal("c", 100, 100);
    const d = { ...goal("d"), archived: true };
    const h = [rec("1", "a", "2026-03-11T02:00:00.000Z")];
    const pending = goalsPendingToday([a, b, c, d], h, now);
    expect(pending.map((g) => g.id)).toEqual(["b"]);
  });

  it("topGoalsByCheckins sorts by count", () => {
    const g = [goal("a"), goal("b")];
    const h = [
      rec("1", "a", "2026-03-09T02:00:00.000Z", 1),
      rec("2", "b", "2026-03-09T03:00:00.000Z", 1),
      rec("3", "b", "2026-03-10T03:00:00.000Z", 1),
    ];
    const top = topGoalsByCheckins(g, h, 2);
    expect(top[0].goal.id).toBe("b");
    expect(top[0].count).toBe(2);
  });
});
