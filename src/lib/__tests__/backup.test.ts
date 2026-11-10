// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BACKUP_VERSION,
  buildBackup,
  mergeBackup,
  parseBackup,
  restoreSnapshot,
  snapshotAt,
} from "@/lib/backup";
import { STORAGE_KEYS, flushWrites, readJSON, writeJSON } from "@/lib/storage";
import { makeGoal, rec } from "@/utils/__tests__/fixtures";
import type { Goal } from "@/types/goal";

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  flushWrites();
});

describe("备份校验", () => {
  it("拒绝非 Track100 文件与结构损坏的文件", () => {
    expect(() => parseBackup("not json")).toThrow("import.invalid");
    expect(() => parseBackup(JSON.stringify({ app: "track100", goals: "oops", history: [] }))).toThrow("import.invalid");
    expect(() => parseBackup(JSON.stringify({ app: "other", goals: [], history: [] }))).toThrow("import.invalid");
    expect(() => parseBackup(JSON.stringify({ app: "track100", goals: [{ id: "x" }], history: [] }))).toThrow("import.invalid");
  });

  it("接受旧版 v1 备份(缺新增字段)", () => {
    const v1 = {
      app: "track100",
      version: 1,
      goals: [makeGoal()],
      history: [rec("2026-11-01T00:00:00Z")],
      settings: {},
      achievements: [],
    };
    expect(parseBackup(JSON.stringify(v1)).goals).toHaveLength(1);
  });

  it("buildBackup 带当前版本号且包含全部数据", () => {
    writeJSON(STORAGE_KEYS.goals, [makeGoal()]);
    flushWrites();
    const b = buildBackup();
    expect(b.version).toBe(BACKUP_VERSION);
    expect(b.goals).toHaveLength(1);
  });
});

describe("合并导入", () => {
  it("按 id 去重合并,保留本地较新目标,不覆盖设备设置", () => {
    const local = makeGoal({ title: "本机较新", updatedAt: "2026-11-09T00:00:00.000Z" });
    const older = makeGoal({ title: "备份较旧", updatedAt: "2026-11-01T00:00:00.000Z" });
    writeJSON(STORAGE_KEYS.goals, [local]);
    writeJSON(STORAGE_KEYS.history, []);
    writeJSON(STORAGE_KEYS.settings, { theme: "dark" });
    flushWrites();

    const data = parseBackup(
      JSON.stringify({
        app: "track100",
        goals: [older, makeGoal({ id: "g2" })],
        history: [rec("2026-11-03T00:00:00Z", 2), rec("2026-11-04T00:00:00Z", 3)],
        settings: { theme: "light" },
        achievements: [],
      }),
    );
    const r = mergeBackup(data);
    expect(r.addedGoals).toBe(1);
    expect(r.addedRecords).toBe(2);
    const goals = readJSON<Goal[]>(STORAGE_KEYS.goals, []);
    expect(goals).toHaveLength(2);
    expect(goals.find((g) => g.id === "g1")!.title).toBe("本机较新");
    expect(readJSON(STORAGE_KEYS.settings, {})).toEqual({ theme: "dark" });
  });

  it("软删除状态不会被旧备份复活", () => {
    const deleted = makeGoal({ deletedAt: "2026-11-09T00:00:00.000Z", updatedAt: "2026-11-09T00:00:00.000Z" });
    writeJSON(STORAGE_KEYS.goals, [deleted]);
    writeJSON(STORAGE_KEYS.history, []);
    flushWrites();
    mergeBackup(parseBackup(JSON.stringify({ app: "track100", goals: [makeGoal()], history: [], achievements: [] })));
    expect(readJSON<Goal[]>(STORAGE_KEYS.goals, [])[0].deletedAt).toBeTruthy();
  });

  it("合并前自动留快照,restoreSnapshot 可完整回滚", () => {
    writeJSON(STORAGE_KEYS.goals, [makeGoal({ title: "原始数据" })]);
    writeJSON(STORAGE_KEYS.history, []);
    flushWrites();

    mergeBackup(
      parseBackup(JSON.stringify({ app: "track100", goals: [makeGoal({ id: "g2" })], history: [], achievements: [] })),
    );
    expect(snapshotAt()).toBeTruthy();
    expect(readJSON<Goal[]>(STORAGE_KEYS.goals, [])).toHaveLength(2);

    expect(restoreSnapshot()).toBe(true);
    const goals = readJSON<Goal[]>(STORAGE_KEYS.goals, []);
    expect(goals).toHaveLength(1);
    expect(goals[0].title).toBe("原始数据");
  });
});
