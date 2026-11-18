import { describe, it, expect } from "vitest";
import { periodSummary } from "../period-summary";
import type { PeriodReview } from "../period-review";

const goal = { id: "g1", title: "读书", icon: "📚", color: "#6E7F4F", category: "learning" } as const;

function base(period: "week" | "month" | "year"): PeriodReview {
  return {
    period,
    key: "x",
    anchorYear: 2026,
    anchorMonth: 11,
    weekNo: 46,
    checkIns: 10,
    litCells: 250,
    activeDays: 5,
    longestStreak: 3,
    completed: [],
    buckets: [],
    topCategory: { category: "learning", count: 8 },
    goalRanks: [{ goal: goal as never, checkIns: 6, cells: 40 }],
    activeGoals: 1,
    notes: 0,
    heat: [],
    bestBucket: { label: "三", count: 4, key: "x" },
  };
}

describe("periodSummary", () => {
  it("空数据各周期返回自己的空文案 key", () => {
    for (const p of ["week", "month", "year"] as const) {
      const r = base(p);
      r.checkIns = 0;
      expect(periodSummary(r).key).toBe(`review.summary.${p}.empty`);
    }
  });

  it("周报：未天天坚持用 main，带最活跃星期补充句", () => {
    const s = periodSummary(base("week"));
    expect(s.key).toBe("review.summary.week.main");
    expect(s.params).toMatchObject({ n: 10, days: 5, streak: 3 });
    expect(s.extraKey).toBe("review.summary.week.best");
    expect(s.extraParams).toMatchObject({ day: "三", n: 4 });
  });

  it("周报：7 天全勤用 perfect", () => {
    const r = base("week");
    r.activeDays = 7;
    expect(periodSummary(r).key).toBe("review.summary.week.perfect");
  });

  it("周报：没有 bestBucket 时无补充句", () => {
    const r = base("week");
    r.bestBucket = null;
    expect(periodSummary(r).extraKey).toBeUndefined();
  });

  it("月报：用累计打卡 + 点亮格子，带最专注目标补充句", () => {
    const s = periodSummary(base("month"));
    expect(s.key).toBe("review.summary.month.main");
    expect(s.params).toMatchObject({ n: 10, cells: 250, days: 5 });
    expect(s.extraKey).toBe("review.summary.month.top");
    expect(s.extraParams).toMatchObject({ goal: "读书", n: 6 });
  });

  it("年报：用点亮格子 + 完成目标，带领域补充句", () => {
    const r = base("year");
    r.completed = [goal as never];
    const s = periodSummary(r);
    expect(s.key).toBe("review.summary.year.main");
    expect(s.params).toMatchObject({ cells: 250, done: 1 });
    expect(s.extraKey).toBe("review.summary.year.cat");
    expect(s.extraParams).toMatchObject({ category: "learning", n: 8 });
  });

  it("年报：无专注领域时无补充句", () => {
    const r = base("year");
    r.topCategory = null;
    expect(periodSummary(r).extraKey).toBeUndefined();
  });
});
