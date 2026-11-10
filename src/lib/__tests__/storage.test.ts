// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  STORAGE_KEYS,
  clearWriteError,
  formatBytes,
  hasWriteError,
  storageUsage,
  subscribeWriteError,
  writeJSON,
} from "@/lib/storage";

// 模拟 setItem 抛异常的 spy 必须在每个用例后还原,否则会污染后续 describe。
afterEach(() => vi.restoreAllMocks());

describe("写入失败可观测", () => {
  beforeEach(() => {
    localStorage.clear();
    clearWriteError();
    vi.restoreAllMocks();
  });

  it("写入成功返回 true,不产生告警", () => {
    expect(writeJSON(STORAGE_KEYS.goals, [{ id: "a" }])).toBe(true);
    expect(hasWriteError()).toBe(false);
  });

  it("setItem 抛配额异常时返回 false 并通知订阅者", () => {
    let notified = 0;
    const unsub = subscribeWriteError(() => notified++);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });

    expect(writeJSON(STORAGE_KEYS.goals, [1])).toBe(false);
    expect(hasWriteError()).toBe(true);
    expect(notified).toBe(1);

    // 连续失败只通知一次,避免刷屏
    writeJSON(STORAGE_KEYS.history, [2]);
    expect(notified).toBe(1);
    unsub();
  });

  it("告警可手动关闭", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    writeJSON(STORAGE_KEYS.goals, [1]);
    expect(hasWriteError()).toBe(true);
    clearWriteError();
    expect(hasWriteError()).toBe(false);
  });
});

describe("容量水位", () => {
  beforeEach(() => localStorage.clear());

  it("按 UTF-16 双字节统计本 App 的各个 key", () => {
    localStorage.setItem(STORAGE_KEYS.goals, "abc");
    localStorage.setItem("unrelated-key", "x".repeat(1000)); // 不计入
    expect(storageUsage()).toBe((STORAGE_KEYS.goals.length + 3) * 2);
  });

  it("formatBytes 按量级格式化", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.00 MB");
  });
});
