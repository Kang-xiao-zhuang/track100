// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useGoalStore } from "@/store/goal.store";
import { STORAGE_KEYS, flushWrites, readJSON, writeJSON } from "@/lib/storage";
import { makeGoal, rec } from "@/utils/__tests__/fixtures";
import { sortGoals } from "@/utils/progress";
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

  it("purgeGoal 同时删除目标、记录和索引", () => {
    const s = useGoalStore.getState();
    const g = s.createGoal(makeGoal());
    s.addProgress(g.id, 1);
    s.purgeGoal(g.id); // 删除语义改为软删除;永久删除走 purgeGoal
    const st = useGoalStore.getState();
    expect(st.goals).toHaveLength(0);
    expect(st.history).toHaveLength(0);
    expect(st.historyOf(g.id)).toEqual([]);
  });

  it("addProgress 返回记录 id;补打卡按所选时间正确排序", () => {
    const s = useGoalStore.getState();
    const g = s.createGoal(makeGoal());
    const r1 = s.addProgress(g.id, 1); // 今天
    const r2 = s.addProgress(g.id, 1, undefined, "2026-11-01T08:00:00.000Z"); // 补到更早的日期
    expect(r1).toBeTruthy();
    expect(r2).toBeTruthy();
    // 新的在前:补打卡的记录排在已有记录之后
    expect(useGoalStore.getState().historyOf(g.id).map((r) => r.id)).toEqual([r1, r2]);
  });

  it("removeRecord 回滚 current,并从 history/byGoal 双处移除", () => {
    const s = useGoalStore.getState();
    const g = s.createGoal({ ...makeGoal(), target: 10 });
    const r1 = s.addProgress(g.id, 7);
    const r2 = s.addProgress(g.id, 7); // clamp 到 10,实际 +3
    expect(useGoalStore.getState().getGoal(g.id)!.current).toBe(10);

    s.removeRecord(g.id, r2!); // 撤销 +3 → 回到 7
    expect(useGoalStore.getState().getGoal(g.id)!.current).toBe(7);
    expect(useGoalStore.getState().historyOf(g.id).map((r) => r.id)).toEqual([r1]);
    expect(useGoalStore.getState().history.find((r) => r.id === r2)).toBeUndefined();

    s.removeRecord(g.id, r1!); // 撤销 +7 → clamp 到 0
    expect(useGoalStore.getState().getGoal(g.id)!.current).toBe(0);
    expect(useGoalStore.getState().historyOf(g.id)).toEqual([]); // 空组从索引里清掉
  });

  it("removeRecord 对不存在的记录/目标是 no-op", () => {
    const s = useGoalStore.getState();
    const g = s.createGoal(makeGoal());
    const r = s.addProgress(g.id, 1);
    s.removeRecord(g.id, "nonexistent");
    s.removeRecord("no-goal", r!);
    expect(useGoalStore.getState().history).toHaveLength(1);
    expect(useGoalStore.getState().getGoal(g.id)!.current).toBe(1);
  });
});

describe("软删除 / 归档 / 完成时间", () => {
  it("deleteGoal 只标记 deletedAt 并保留历史,restoreGoal 可恢复", () => {
    const s = useGoalStore.getState();
    const g = s.createGoal(makeGoal());
    s.addProgress(g.id, 1);
    s.deleteGoal(g.id);
    expect(useGoalStore.getState().getGoal(g.id)!.deletedAt).toBeTruthy();
    expect(useGoalStore.getState().historyOf(g.id)).toHaveLength(1);
    s.restoreGoal(g.id);
    expect(useGoalStore.getState().getGoal(g.id)!.deletedAt).toBeUndefined();
    expect(useGoalStore.getState().historyOf(g.id)).toHaveLength(1);
  });

  it("purgeGoal 永久删除目标与历史", () => {
    const s = useGoalStore.getState();
    const g = s.createGoal(makeGoal());
    s.addProgress(g.id, 1);
    s.purgeGoal(g.id);
    expect(useGoalStore.getState().goals).toHaveLength(0);
    expect(useGoalStore.getState().history).toHaveLength(0);
    expect(useGoalStore.getState().historyOf(g.id)).toEqual([]);
  });

  it("setArchived 切换归档状态且不影响历史", () => {
    const s = useGoalStore.getState();
    const g = s.createGoal(makeGoal());
    s.addProgress(g.id, 1);
    s.setArchived(g.id, true);
    expect(useGoalStore.getState().getGoal(g.id)!.archived).toBe(true);
    s.setArchived(g.id, false);
    expect(useGoalStore.getState().getGoal(g.id)!.archived).toBe(false);
    expect(useGoalStore.getState().historyOf(g.id)).toHaveLength(1);
  });

  it("补打卡写 backfilled 并保存备注;实时打卡不带标记", () => {
    const s = useGoalStore.getState();
    const g = s.createGoal(makeGoal());
    const r1 = s.addProgress(g.id, 1, "今天读完了第一本");
    const r2 = s.addProgress(g.id, 1, undefined, "2026-11-01T08:00:00.000Z");
    const records = useGoalStore.getState().historyOf(g.id);
    expect(records.find((r) => r.id === r1)!.note).toBe("今天读完了第一本");
    expect(records.find((r) => r.id === r1)!.backfilled).toBeUndefined();
    expect(records.find((r) => r.id === r2)!.backfilled).toBe(true);
  });

  it("首次达成写 completedAt,撤销回落后清除", () => {
    const s = useGoalStore.getState();
    const g = s.createGoal({ ...makeGoal(), target: 2, step: 1 });
    s.addProgress(g.id, 1);
    expect(useGoalStore.getState().getGoal(g.id)!.completedAt).toBeUndefined();
    const r = s.addProgress(g.id, 1);
    expect(useGoalStore.getState().getGoal(g.id)!.completedAt).toBeTruthy();
    s.removeRecord(g.id, r!);
    expect(useGoalStore.getState().getGoal(g.id)!.completedAt).toBeUndefined();
  });

  it("setPinned 把目标移到最前,取消后排到末尾", () => {
    const s = useGoalStore.getState();
    const a = s.createGoal(makeGoal());
    const b = s.createGoal(makeGoal());
    const c = s.createGoal(makeGoal()); // 新建插在最前 → [c, b, a]
    const ids = () => sortGoals(useGoalStore.getState().goals).map((g) => g.id);
    expect(ids()).toEqual([c.id, b.id, a.id]);

    s.setPinned(a.id, true);
    expect(ids()).toEqual([a.id, c.id, b.id]);
    expect(stored<{ id: string; order?: number }[]>(STORAGE_KEYS.goals).find((g) => g.id === a.id)!.order).toBeLessThan(0);

    s.setPinned(a.id, false);
    expect(ids()).toEqual([c.id, b.id, a.id]);
  });

  it("moveGoal 只在可见目标间交换,忽略归档目标", () => {
    const s = useGoalStore.getState();
    const a = s.createGoal(makeGoal());
    const b = s.createGoal(makeGoal());
    const c = s.createGoal(makeGoal()); // [c, b, a]
    s.setArchived(b.id, true);
    s.moveGoal(c.id, 1); // 可见列表 [c, a] → [a, c]
    const visible = sortGoals(
      useGoalStore.getState().goals.filter((g) => !g.archived && !g.deletedAt),
    ).map((g) => g.id);
    expect(visible).toEqual([a.id, c.id]);

    s.moveGoal(a.id, -1); // 已在最上,不动
    expect(sortGoals(useGoalStore.getState().goals.filter((g) => !g.archived && !g.deletedAt)).map((g) => g.id))
      .toEqual([a.id, c.id]);
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
