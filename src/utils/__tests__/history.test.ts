import { describe, expect, it } from "vitest";
import { indexByGoal, sortNewestFirst } from "@/utils/history";
import { rec } from "./fixtures";

describe("history", () => {
  it("sortNewestFirst 不修改原数组", () => {
    const a = rec("2026-11-01T00:00:00Z");
    const b = rec("2026-11-03T00:00:00Z");
    const input = [a, b];
    expect(sortNewestFirst(input)).toEqual([b, a]);
    expect(input).toEqual([a, b]);
  });

  it("indexByGoal 分组并保持顺序", () => {
    const r1 = rec("2026-11-03T00:00:00Z", 1, "x");
    const r2 = rec("2026-11-02T00:00:00Z", 1, "y");
    const r3 = rec("2026-11-01T00:00:00Z", 1, "x");
    expect(indexByGoal([r1, r2, r3])).toEqual({ x: [r1, r3], y: [r2] });
  });
});
