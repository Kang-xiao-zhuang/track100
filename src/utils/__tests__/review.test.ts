import { describe, expect, it } from "vitest";
import { availableYears, buildReview } from "@/utils/review";
import { makeGoal, rec } from "./fixtures";

const NOW = new Date("2026-11-10T12:00:00");

const g1 = makeGoal({ id: "g1", title: "读书", target: 100, createdAt: "2026-01-01T00:00:00" });
const g2 = makeGoal({ id: "g2", title: "跑步", category: "health", target: 10, createdAt: "2026-02-01T00:00:00", completedAt: "2026-06-01T00:00:00" });
const g3 = makeGoal({ id: "g3", title: "已删", target: 10, createdAt: "2026-02-01T00:00:00", deletedAt: "2026-09-01T00:00:00" });
const goals = [g1, g2, g3];

const history = [
  rec("2026-03-01T10:00:00", 5, "g1"),
  { ...rec("2026-03-01T11:00:00", 5, "g1"), note: "读到第三章" },
  rec("2026-04-01T10:00:00", 1, "g2"),
  rec("2026-04-02T10:00:00", 1, "g2"),
  rec("2026-04-04T10:00:00", 1, "g2"),
  rec("2026-05-01T10:00:00", 99, "g3"), // 回收站里的目标不计入
  rec("2025-12-31T10:00:00", 50, "g1"), // 跨年不计入
  rec("2026-06-01T10:00:00", -2, "g1"), // 负向记录不计入
];

describe("buildReview", () => {
  it("只统计该年的正向记录,并排除软删除目标", () => {
    const r = buildReview(goals, history, 2026, NOW);
    expect(r.checkIns).toBe(5);
    expect(r.activeDays).toBe(4);
    expect(r.activeGoals).toBe(2);
    expect(r.notes).toBe(1);
    expect(r.goalRanks.map((x) => x.goal.id)).toEqual(["g2", "g1"]);
  });

  it("点亮格数按 value / target * 100 折算", () => {
    const r = buildReview(goals, history, 2026, NOW);
    // g1: 5+5 = 10 格;g2: 每条 1/10 = 10 格 ×3 = 30 格
    expect(r.litCells).toBe(40);
  });

  it("月度分布、最长连击与最活跃月份", () => {
    const r = buildReview(goals, history, 2026, NOW);
    expect(r.monthly).toHaveLength(12);
    expect(r.monthly[2].count).toBe(2); // 3 月
    expect(r.monthly[3].count).toBe(3); // 4 月
    expect(r.bestMonth).toBe(4);
    expect(r.longestStreak).toBe(2); // 4/1、4/2
  });

  it("完成目标按 completedAt 归属年份,归档也算、回收站不算", () => {
    expect(buildReview(goals, history, 2026, NOW).completed.map((g) => g.id)).toEqual(["g2"]);
    expect(buildReview(goals, history, 2025, NOW).completed).toEqual([]);
    expect(buildReview([g1, { ...g2, archived: true }], history, 2026, NOW).completed.map((g) => g.id)).toEqual(["g2"]);
  });

  it("分类与热力按本地日期生成", () => {
    const r = buildReview(goals, history, 2026, NOW);
    expect(r.topCategory).toEqual({ category: "health", count: 3 });
    expect(r.heat[0].key).toBe("2026-01-01");
    expect(r.heat.at(-1)!.key).toBe("2026-11-10"); // 当前年只画到今天
    expect(r.heat.find((d) => d.key === "2026-04-01")!.count).toBe(1);
  });

  it("无记录的年份返回全零且 completed 为空", () => {
    const r = buildReview(goals, history, 2024, NOW);
    expect(r.checkIns).toBe(0);
    expect(r.litCells).toBe(0);
    expect(r.bestMonth).toBeNull();
    expect(r.topCategory).toBeNull();
  });
});

describe("availableYears", () => {
  it("包含今年、有记录的年份、目标创建与完成年份", () => {
    expect(availableYears(goals, history, NOW)).toEqual([2026, 2025]);
  });
});
