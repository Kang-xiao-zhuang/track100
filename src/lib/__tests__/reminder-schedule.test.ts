import { describe, expect, it } from "vitest";
import {
  MIN_PENDING,
  REMINDER_DAYS,
  TEST_NOTIFICATION_ID,
  allReminderIds,
  isScheduleStale,
  nextTriggerSlots,
  normalizeReminderTimes,
  parseReminderTime,
  reminderIds,
  type ReminderScheduleRecord,
} from "@/lib/reminder-schedule";

// TZ 固定为 Asia/Shanghai,无夏令时,每天严格相差 24h
const BEFORE = new Date(2026, 10, 10, 19, 30, 0);
const AFTER = new Date(2026, 10, 10, 21, 30, 0);
const NOW_MS = BEFORE.getTime();

function rec(patch: Partial<ReminderScheduleRecord> = {}): ReminderScheduleRecord {
  return { time: "20:00", lang: "zh", ids: reminderIds(), scheduledAt: NOW_MS, ...patch };
}

describe("reminderIds", () => {
  it("数量固定、互不重复,且不与测试通知 id 冲突", () => {
    const ids = reminderIds();
    expect(ids).toHaveLength(REMINDER_DAYS);
    expect(new Set(ids).size).toBe(REMINDER_DAYS);
    expect(ids).not.toContain(TEST_NOTIFICATION_ID);
  });
  it("补齐阈值小于总量", () => {
    expect(MIN_PENDING).toBeLessThan(REMINDER_DAYS);
  });
  it("多时段 ID 段互不重叠", () => {
    const a = reminderIds(0);
    const b = reminderIds(1);
    const c = reminderIds(2);
    const all = allReminderIds();
    expect(new Set([...a, ...b, ...c]).size).toBe(all.length);
    expect(all).not.toContain(TEST_NOTIFICATION_ID);
  });
});

describe("normalizeReminderTimes", () => {
  it("去空、去重、补零、排序、限长", () => {
    expect(normalizeReminderTimes(["9:5", "20:00", "9:05", "bad", "07:30", "12:00", "18:00"]))
      .toEqual(["07:30", "09:05", "12:00"]); // 最多 3 个,排序后取前三
  });
  it("空输入回退到默认时段", () => {
    expect(normalizeReminderTimes([])).toEqual(["20:00"]);
    expect(normalizeReminderTimes(undefined)).toEqual(["20:00"]);
  });
});

describe("parseReminderTime", () => {
  it("正常解析并兜底非法输入", () => {
    expect(parseReminderTime("07:05")).toEqual({ hour: 7, minute: 5 });
    expect(parseReminderTime("bad")).toEqual({ hour: 20, minute: 0 });
    expect(parseReminderTime("99:99")).toEqual({ hour: 23, minute: 59 });
  });
});

describe("nextTriggerSlots", () => {
  it("设定时刻未到:第一条是今天", () => {
    const slots = nextTriggerSlots("20:00", BEFORE);
    expect(slots).toHaveLength(REMINDER_DAYS);
    expect(slots[0].getFullYear()).toBe(2026);
    expect(slots[0].getMonth()).toBe(10);
    expect(slots[0].getDate()).toBe(10);
    expect(slots[0].getHours()).toBe(20);
    expect(slots[0].getMinutes()).toBe(0);
  });

  it("设定时刻已过:第一条是明天", () => {
    const slots = nextTriggerSlots("20:00", AFTER);
    expect(slots).toHaveLength(REMINDER_DAYS);
    expect(slots[0].getDate()).toBe(11);
    expect(slots[0].getTime()).toBeGreaterThan(AFTER.getTime());
  });

  it("连续 14 天、每天都在同一时刻", () => {
    const slots = nextTriggerSlots("20:00", BEFORE);
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].getTime() - slots[i - 1].getTime()).toBe(86400000);
    }
    expect(slots[13].getDate()).toBe(23);
    expect(slots.every((d) => d.getHours() === 20 && d.getMinutes() === 0)).toBe(true);
  });

  it("时间格式异常时退回 20:00,仍生成完整序列", () => {
    const slots = nextTriggerSlots("oops", BEFORE);
    expect(slots).toHaveLength(REMINDER_DAYS);
    expect(slots[0].getHours()).toBe(20);
  });
});

describe("isScheduleStale", () => {
  it("从未排过 / ids 为空 → 需要重排", () => {
    expect(isScheduleStale(null, "20:00", "zh", NOW_MS)).toBe(true);
    expect(isScheduleStale(rec({ ids: [] }), "20:00", "zh", NOW_MS)).toBe(true);
  });

  it("刚排过且设置未变 → 不重排", () => {
    expect(isScheduleStale(rec(), "20:00", "zh", NOW_MS)).toBe(false);
  });

  it("时间 / 语言变化 → 重排", () => {
    expect(isScheduleStale(rec(), "21:00", "zh", NOW_MS)).toBe(true);
    expect(isScheduleStale(rec(), "20:00", "en", NOW_MS)).toBe(true);
  });

  it("超过一周 → 强制重排", () => {
    expect(isScheduleStale(rec(), "20:00", "zh", NOW_MS + 8 * 86400000)).toBe(true);
  });
});
