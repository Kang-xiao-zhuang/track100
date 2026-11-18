import { describe, expect, it } from "vitest";
import { getCheckinCheer, getDailyCheer } from "@/lib/encouragement";

describe("每日鼓励", () => {
  it("同一天同一语言恒定,换天自动换句", () => {
    const morning = new Date(2026, 0, 1, 8, 0, 0);
    const night = new Date(2026, 0, 1, 23, 59, 0);
    const next = new Date(2026, 0, 2, 0, 1, 0);
    expect(getDailyCheer("zh", morning)).toBe(getDailyCheer("zh", night));
    expect(getDailyCheer("zh", next)).not.toBe(getDailyCheer("zh", morning));
  });

  it("中英文各自成句,不串语言", () => {
    const d = new Date(2026, 5, 12);
    expect(getDailyCheer("zh", d)).toMatch(/[\u4e00-\u9fa5]/);
    expect(getDailyCheer("en", d)).not.toMatch(/[\u4e00-\u9fa5]/);
  });

  it("跨月跨年不会重复取到同一索引", () => {
    const a = getDailyCheer("zh", new Date(2025, 11, 31));
    const b = getDailyCheer("zh", new Date(2026, 0, 1));
    expect(a).not.toBe(b);
  });
});

describe("点亮鼓励", () => {
  it("连续点亮不同格子数会换句", () => {
    const a = getCheckinCheer({ lang: "zh", litCells: 7 });
    const b = getCheckinCheer({ lang: "zh", litCells: 8 });
    expect(a).not.toBe(b);
  });

  it("里程碑带出当前格数", () => {
    const s = getCheckinCheer({ lang: "zh", litCells: 100, milestone: true });
    expect(s).toContain("100");
  });

  it("完成目标优先于里程碑,并带出目标名", () => {
    const s = getCheckinCheer({ lang: "zh", litCells: 100, milestone: true, completed: true, goalTitle: "读书" });
    expect(s).toContain("读书");
    expect(s).not.toContain("100");
  });

  it("脏数据不会让文案崩掉", () => {
    expect(getCheckinCheer({ lang: "zh", litCells: Number.NaN })).toBeTruthy();
  });
});
