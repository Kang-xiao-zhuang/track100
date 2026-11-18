import { describe, expect, it } from "vitest";
import { currentStreak, todayCheckIns } from "@/utils/streak";
import type { ProgressRecord } from "@/types/goal";

function rec(day: string, value = 1, backfilled = false): ProgressRecord {
  return {
    id: day + String(value),
    goalId: "g",
    value,
    createdAt: new Date(`${day}T10:00:00`).toISOString(),
    backfilled,
  };
}

describe("连续打卡天数", () => {
  const now = new Date(2026, 0, 5, 9, 0, 0); // 1 月 5 日上午

  it("今天已打卡,连今天一起数", () => {
    const history = [rec("2026-01-05"), rec("2026-01-04"), rec("2026-01-03")];
    expect(currentStreak(history, now)).toBe(3);
  });

  it("今天还没打卡时从昨天往前数,早上不显示 0", () => {
    const history = [rec("2026-01-04"), rec("2026-01-03")];
    expect(currentStreak(history, now)).toBe(2);
  });

  it("昨天也断了就是 0", () => {
    expect(currentStreak([rec("2026-01-03")], now)).toBe(0);
  });

  it("补打卡按记录日期算,能接上连续", () => {
    const history = [rec("2026-01-04"), rec("2026-01-03", 1, true)];
    expect(currentStreak(history, now)).toBe(2);
  });

  it("跨月连续正确", () => {
    const history = [rec("2025-12-31"), rec("2026-01-01"), rec("2026-01-02")];
    expect(currentStreak(history, new Date(2026, 0, 2, 20, 0))).toBe(3);
  });

  it("撤销记录(value<0)不算打卡", () => {
    expect(currentStreak([rec("2026-01-04", -1)], now)).toBe(0);
  });
});

describe("今日打卡次数", () => {
  it("只数今天的记录", () => {
    const now = new Date(2026, 0, 5, 12, 0, 0);
    const history = [rec("2026-01-05"), rec("2026-01-05", 2), rec("2026-01-04")];
    expect(todayCheckIns(history, now)).toBe(2);
  });
});
