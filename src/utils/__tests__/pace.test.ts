import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pace } from "@/utils/pace";
import { makeGoal, rec } from "./fixtures";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-11T00:00:00.000Z"));
});
afterEach(() => vi.useRealTimers());

describe("pace", () => {
  it("已完成", () => {
    expect(pace(makeGoal({ current: 100 }), [])).toMatchObject({ done: true, projectedDate: null });
  });

  it("没有打卡无法预测", () => {
    expect(pace(makeGoal({ current: 0 }), [])).toBeNull();
  });

  it("10 天完成 20%,预计再 40 天完成", () => {
    const goal = makeGoal({ current: 20 }); // createdAt 11-01
    const p = pace(goal, [rec("2026-11-05T00:00:00.000Z", 20)])!;
    expect(p.perDay).toBeCloseTo(2);
    expect(p.projectedDate!.toISOString()).toBe("2026-12-21T00:00:00.000Z");
  });

  it("有截止日时算领先/落后天数", () => {
    const goal = makeGoal({ current: 20, endDate: "2026-12-31T00:00:00.000Z" });
    expect(pace(goal, [rec("2026-11-05T00:00:00.000Z", 20)])!.aheadDays).toBe(10);
  });
});
