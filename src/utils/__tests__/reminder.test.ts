import { describe, expect, it } from "vitest";
import { pickCheckinGoal } from "@/utils/reminder";
import { makeGoal, rec } from "./fixtures";

const today = new Date().toISOString();

describe("pickCheckinGoal", () => {
  it("排除归档、软删除和已完成的目标", () => {
    const goals = [
      makeGoal({ id: "archived", archived: true }),
      makeGoal({ id: "deleted", deletedAt: today }),
      makeGoal({ id: "done", current: 100 }),
      makeGoal({ id: "ok" }),
    ];
    expect(pickCheckinGoal(goals, [])?.id).toBe("ok");
  });

  it("优先今天未打卡的目标,并按 updatedAt 取最近更新的", () => {
    const goals = [
      makeGoal({ id: "fresh", updatedAt: "2026-11-09T00:00:00.000Z" }),
      makeGoal({ id: "older", updatedAt: "2026-11-01T00:00:00.000Z" }),
    ];
    expect(pickCheckinGoal(goals, [rec(today, 1, "fresh")])?.id).toBe("older");
    expect(pickCheckinGoal(goals, [])?.id).toBe("fresh");
  });

  it("负向记录不算今日打卡", () => {
    const goals = [makeGoal({ id: "only" })];
    expect(pickCheckinGoal(goals, [rec(today, -1, "only")])?.id).toBe("only");
  });

  it("今天全部打过卡、或没有可用目标时返回 null(避免误加)", () => {
    const goals = [makeGoal({ id: "a" }), makeGoal({ id: "b" })];
    expect(pickCheckinGoal(goals, [rec(today, 1, "a"), rec(today, 1, "b")])).toBeNull();
    expect(pickCheckinGoal([], [])).toBeNull();
    expect(pickCheckinGoal([makeGoal({ id: "done", current: 100 })], [])).toBeNull();
  });
});
