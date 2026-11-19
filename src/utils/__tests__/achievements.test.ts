import { describe, expect, it } from "vitest";
import { achievements } from "@/utils/achievements";
import type { ProgressRecord } from "@/types/goal";
import { makeGoal } from "./fixtures";

function recs(days: string[]): ProgressRecord[] {
  return days.map((d, i) => ({
    id: `r${i}`,
    goalId: "g1",
    value: 1,
    createdAt: new Date(`${d}T10:00:00`).toISOString(),
  }));
}

function dayRange(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(2026, 0, 1 + i, 10);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
}

const badge = (id: string, days: number) => achievements([makeGoal()], recs(dayRange(days))).find((b) => b.id === id)!;

describe("时间型长期里程碑", () => {
  it("累计活跃天数达标才解锁,按去重天数算", () => {
    expect(badge("days30", 29).unlocked).toBe(false);
    const b = badge("days30", 30);
    expect(b.unlocked).toBe(true);
    expect(b.current).toBe(30);
    expect(b.target).toBe(30);
  });

  it("同一天多次打卡只算一天", () => {
    const dup = [
      ...recs(["2026-01-01", "2026-01-01", "2026-01-01"]),
    ];
    const b = achievements([makeGoal()], dup).find((x) => x.id === "days30")!;
    expect(b.current).toBe(1);
  });

  it("100 天 / 365 天门槛正确", () => {
    expect(badge("days100", 99).unlocked).toBe(false);
    expect(badge("days100", 100).unlocked).toBe(true);
    expect(badge("days365", 364).unlocked).toBe(false);
    expect(badge("days365", 365).unlocked).toBe(true);
  });

  it("成就总数从 12 增至 15", () => {
    expect(achievements([makeGoal()], [])).toHaveLength(15);
  });
});
