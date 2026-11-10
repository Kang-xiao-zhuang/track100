import { describe, expect, it } from "vitest";
import { habitStats, periodKey, shiftPeriodKey } from "@/utils/habit";
import { makeGoal, rec } from "./fixtures";

const NOW = new Date("2026-11-10T12:00:00");
const goal = makeGoal({ createdAt: "2026-11-01T00:00:00", target: 100, type: "habit", habitPeriod: "daily" });

describe("periodKey / shiftPeriodKey", () => {
  it("daily 返回本地日期,weekly 返回所在周周一", () => {
    expect(periodKey("2026-11-10", "daily")).toBe("2026-11-10");
    expect(periodKey("2026-11-10", "weekly")).toBe("2026-11-09"); // 周二 → 周一
    expect(periodKey("2026-11-09", "weekly")).toBe("2026-11-09");
    expect(periodKey("2026-11-15", "weekly")).toBe("2026-11-09"); // 周日仍属同一周
  });

  it("按周期前后移动", () => {
    expect(shiftPeriodKey("2026-11-10", "daily", -1)).toBe("2026-11-09");
    expect(shiftPeriodKey("2026-11-09", "weekly", 1)).toBe("2026-11-16");
    expect(shiftPeriodKey("2026-11-09", "weekly", -1)).toBe("2026-11-02");
  });
});

describe("habitStats", () => {
  it("连续三天且今天已打卡 → 连击 3,坚持率按经过周期算", () => {
    const records = [rec("2026-11-08T09:00:00"), rec("2026-11-09T09:00:00"), rec("2026-11-10T09:00:00")];
    const s = habitStats(goal, records, "daily", NOW);
    expect(s.streak).toBe(3);
    expect(s.longest).toBe(3);
    expect(s.checkedPeriods).toBe(3);
    expect(s.elapsedPeriods).toBe(10); // 11/01 → 11/10 共 10 天
    expect(s.consistency).toBe(30);
    expect(s.doneThisPeriod).toBe(true);
    expect(s.recent).toHaveLength(28);
    expect(s.recent.at(-1)!.count).toBe(1);
  });

  it("今天还没打卡时从上一周期起算,不立刻清零", () => {
    const s = habitStats(goal, [rec("2026-11-08T09:00:00"), rec("2026-11-09T09:00:00")], "daily", NOW);
    expect(s.streak).toBe(2);
    expect(s.doneThisPeriod).toBe(false);
  });

  it("最长连击取历史最长段,负值记录不算打卡", () => {
    const records = [
      rec("2026-11-01T09:00:00"), rec("2026-11-02T09:00:00"), rec("2026-11-03T09:00:00"),
      rec("2026-11-07T09:00:00"), rec("2026-11-08T09:00:00"),
      rec("2026-11-08T10:00:00", -1),
    ];
    const s = habitStats(goal, records, "daily", NOW);
    expect(s.streak).toBe(0);
    expect(s.longest).toBe(3);
    expect(s.checkedPeriods).toBe(5);
    expect(s.consistency).toBe(50);
  });

  it("同一周期多次打卡只算一个达标周期,但热力格记录次数", () => {
    const records = [rec("2026-11-10T09:00:00"), rec("2026-11-10T12:00:00"), rec("2026-11-10T20:00:00")];
    const s = habitStats(goal, records, "daily", NOW);
    expect(s.checkedPeriods).toBe(1);
    expect(s.streak).toBe(1);
    expect(s.recent.at(-1)!.count).toBe(3);
  });

  it("weekly 把同一周的多条记录合并,并按周计算连击", () => {
    const weekly = { ...goal, habitPeriod: "weekly" as const, createdAt: "2026-10-01T00:00:00" };
    const records = [
      rec("2026-11-02T09:00:00"), rec("2026-11-05T09:00:00"), // 同一周(周一 11/02)
      rec("2026-11-09T09:00:00"),                             // 下一周(周一 11/09)
    ];
    const s = habitStats(weekly, records, "weekly", NOW);
    expect(s.checkedPeriods).toBe(2);
    expect(s.streak).toBe(2);
    expect(s.longest).toBe(2);
    expect(s.recent).toHaveLength(12);
    expect(s.doneThisPeriod).toBe(true);
  });
});
