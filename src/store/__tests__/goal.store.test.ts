// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useGoalStore } from "@/store/goal.store";
import { STORAGE_KEYS, flushWrites, readJSON, writeJSON } from "@/lib/storage";
import { makeGoal, rec } from "@/utils/__tests__/fixtures";
import type { ProgressRecord } from "@/types/goal";

function stored<T>(key: string): T {
  return JSON.parse(localStorage.getItem(key) ?? "null");
}

beforeEach(() => {
  localStorage.clear();
  useGoalStore.setState({ goals: [], history: [], byGoal: {}, hydrated: false });
});
afterEach(() => flushWrites());

describe("goal store", () => {
  it("hydrate 时把乱序的导入记录排成新的在前,并建立索引", () => {
    const older = rec("2026-11-01T00:00:00Z");
    const newer = rec("2026-11-02T00:00:00Z");
    writeJSON(STORAGE_KEYS.goals, [makeGoal()]);
    writeJSON(STORAGE_KEYS.history, [older, newer]);
    useGoalStore.getState().hydrate();
    expect(useGoalStore.getState().history).toEqual([newer, older]);
    expect(useGoalStore.getState().historyOf("g1")).toEqual([newer, older]);
  });

  it("addProgress 限制在 0..target,触底不产生空记录", () => {
    const s = useGoalStore.getState();
    const g = s.createGoal({ ...makeGoal(), target: 10 });
    s.addProgress(g.id, 25);
    expect(useGoalStore.getState().getGoal(g.id)!.current).toBe(10);
    expect(useGoalStore.getState().historyOf(g.id)[0].value).toBe(10); // 记实际增量

    s.addProgress(g.id, 1); // 已满
    s.addProgress(g.id, -20);
    s.addProgress(g.id, -1); // 已到 0
    expect(useGoalStore.getState().historyOf(g.id).map((r) => r.value)).toEqual([-10, 10]);
  });

  it("historyOf 只在本目标变化时返回新数组", () => {
    const s = useGoalStore.getState();
    const a = s.createGoal(makeGoal());
    const b = s.createGoal(makeGoal());
    s.addProgress(a.id, 1);
    const before = useGoalStore.getState().historyOf(a.id);
    s.addProgress(b.id, 1);
    expect(useGoalStore.getState().historyOf(a.id)).toBe(before);
  });

  it("deleteGoal 同时删除记录和索引", () => {
    const s = useGoalStore.getState();
    const g = s.createGoal(makeGoal());
    s.addProgress(g.id, 1);
    s.deleteGoal(g.id);
    const st = useGoalStore.getState();
    expect(st.goals).toHaveLength(0);
    expect(st.history).toHaveLength(0);
    expect(st.historyOf(g.id)).toEqual([]);
  });
});

describe("延迟写入", () => {
  it("打卡记录先排队,readJSON 读到最新值,flush 后落盘", () => {
    const s = useGoalStore.getState();
    const g = s.createGoal(makeGoal());
    s.addProgress(g.id, 1);
    s.addProgress(g.id, 1);
    expect(stored<{ current: number }[]>(STORAGE_KEYS.goals)[0].current).toBe(0); // 新建目标立即写,打卡还在排队
    expect(stored(STORAGE_KEYS.history)).toBeNull();
    expect(readJSON<ProgressRecord[]>(STORAGE_KEYS.history, [])).toHaveLength(2); // 导出备份能拿到

    flushWrites();
    expect(stored<ProgressRecord[]>(STORAGE_KEYS.history)).toHaveLength(2);
    expect(stored<{ current: number }[]>(STORAGE_KEYS.goals)[0].current).toBe(2);
  });

  it("切到后台时立即落盘", () => {
    const s = useGoalStore.getState();
    s.addProgress(s.createGoal(makeGoal()).id, 1);
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(stored<ProgressRecord[]>(STORAGE_KEYS.history)).toHaveLength(1);
  });

  it("新建目标时把排队中的打卡一起落盘", () => {
    const s = useGoalStore.getState();
    s.addProgress(s.createGoal(makeGoal()).id, 1);
    s.createGoal(makeGoal());
    expect(stored<ProgressRecord[]>(STORAGE_KEYS.history)).toHaveLength(1);
  });

  it("直接写入(导入备份)不会被排队中的旧值覆盖", () => {
    const s = useGoalStore.getState();
    s.addProgress(s.createGoal(makeGoal()).id, 1);
    const imported = [rec("2026-01-01T00:00:00Z"), rec("2026-01-02T00:00:00Z")];
    writeJSON(STORAGE_KEYS.history, imported);
    flushWrites();
    expect(stored(STORAGE_KEYS.history)).toEqual(imported);
  });
});
