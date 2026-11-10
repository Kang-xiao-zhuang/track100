import { create } from "zustand";
import type { Goal, ProgressRecord } from "@/types/goal";
import { STORAGE_KEYS, flushWrites, readJSON, writeJSON, writeJSONDeferred } from "@/lib/storage";
import { createId } from "@/lib/id";
import { indexByGoal, sortNewestFirst } from "@/utils/history";
import { sortGoals } from "@/utils/progress";

export type GoalInput = Omit<
  Goal,
  "id" | "current" | "createdAt" | "updatedAt" | "archived" | "deletedAt" | "completedAt"
> &
  Partial<Pick<Goal, "current">>;

interface GoalState {
  goals: Goal[];
  /** 全部打卡记录,始终新的在前。 */
  history: ProgressRecord[];
  /** history 按目标分组的索引 —— historyOf 直接查表,返回的数组引用稳定。 */
  byGoal: Record<string, ProgressRecord[]>;
  hydrated: boolean;
  hydrate: () => void;
  getGoal: (id: string) => Goal | undefined;
  historyOf: (id: string) => ProgressRecord[];
  createGoal: (input: GoalInput) => Goal;
  updateGoal: (id: string, patch: Partial<GoalInput>) => void;
  /** 软删除:移入回收站,保留打卡记录,可在设置里恢复。 */
  deleteGoal: (id: string) => void;
  /** 从回收站恢复。 */
  restoreGoal: (id: string) => void;
  /** 永久删除:连同历史记录一并清除,不可恢复。 */
  purgeGoal: (id: string) => void;
  setArchived: (id: string, archived: boolean) => void;
  /** 置顶/取消置顶:order 负数 = 置顶,取消时排到末尾。 */
  setPinned: (id: string, pinned: boolean) => void;
  /** 在可见目标中上移/下移一格;全量归一化 order 后交换。 */
  moveGoal: (id: string, dir: -1 | 1) => void;
  /** 返回新记录的 id,供「撤销」定位;打卡实际增量为 0 时不产生记录,返回 null。 */
  addProgress: (id: string, delta: number, note?: string, at?: string) => string | null;
  /** 撤销:移除一条记录并把 goal.current 反向回滚(clamp 在 0..target)。 */
  removeRecord: (goalId: string, recordId: string) => void;
}

const EMPTY: ProgressRecord[] = [];

// 新建/编辑目标立即写;顺带把排队中的打卡记录一起落盘,保持 goals 与 history 一致
const persistGoals = (goals: Goal[]) => {
  writeJSON(STORAGE_KEYS.goals, goals);
  flushWrites();
};
// 打卡/删除会同时改 goals 和 history:一起合并延迟写(见 lib/storage),
// 这样即使进程被杀,两者也不会出现 current 已更新但记录丢失的不一致。
const persistBoth = (goals: Goal[], history: ProgressRecord[]) => {
  writeJSONDeferred(STORAGE_KEYS.goals, goals);
  writeJSONDeferred(STORAGE_KEYS.history, history);
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  history: [],
  byGoal: {},
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    // 导入的备份顺序不一定对,加载时统一排一次,之后新增记录都插在最前
    const history = sortNewestFirst(readJSON<ProgressRecord[]>(STORAGE_KEYS.history, []));
    set({
      goals: readJSON<Goal[]>(STORAGE_KEYS.goals, []),
      history,
      byGoal: indexByGoal(history),
      hydrated: true,
    });
  },

  getGoal: (id) => get().goals.find((g) => g.id === id),
  historyOf: (id) => get().byGoal[id] ?? EMPTY,

  createGoal: (input) => {
    const now = new Date().toISOString();
    const goal: Goal = {
      ...input,
      id: createId(),
      current: input.current ?? 0,
      createdAt: now,
      updatedAt: now,
      archived: false,
    };
    const goals = [goal, ...get().goals];
    set({ goals });
    persistGoals(goals);
    return goal;
  },

  updateGoal: (id, patch) => {
    const goals = get().goals.map((g) =>
      g.id === id ? { ...g, ...patch, updatedAt: new Date().toISOString() } : g,
    );
    set({ goals });
    persistGoals(goals);
  },

  deleteGoal: (id) => {
    const now = new Date().toISOString();
    const goals = get().goals.map((g) =>
      g.id === id ? { ...g, deletedAt: now, updatedAt: now } : g,
    );
    set({ goals });
    persistGoals(goals);
  },

  restoreGoal: (id) => {
    const goals = get().goals.map((g) => {
      if (g.id !== id) return g;
      const { deletedAt: _removed, ...rest } = g;
      return { ...rest, updatedAt: new Date().toISOString() };
    });
    set({ goals });
    persistGoals(goals);
  },

  purgeGoal: (id) => {
    const goals = get().goals.filter((g) => g.id !== id);
    const history = get().history.filter((r) => r.goalId !== id);
    const { [id]: _removed, ...byGoal } = get().byGoal;
    set({ goals, history, byGoal });
    persistBoth(goals, history);
  },

  setArchived: (id, archived) => {
    const goals = get().goals.map((g) =>
      g.id === id ? { ...g, archived, updatedAt: new Date().toISOString() } : g,
    );
    set({ goals });
    persistGoals(goals);
  },

  setPinned: (id, pinned) => {
    const all = get().goals;
    const orders = all.map((g) => g.order ?? 0);
    const order = pinned ? Math.min(0, ...orders) - 1 : Math.max(0, ...orders) + 1;
    const goals = all.map((g) =>
      g.id === id ? { ...g, order, updatedAt: new Date().toISOString() } : g,
    );
    set({ goals });
    persistGoals(goals);
  },

  moveGoal: (id, dir) => {
    const all = get().goals;
    // 只对首页可见的目标排序,避免与回收站/归档里的隐藏目标交换位置
    const listed = sortGoals(all.filter((g) => !g.archived && !g.deletedAt));
    const idx = listed.findIndex((g) => g.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= listed.length) return;

    const orderMap = new Map(listed.map((g, i) => [g.id, i]));
    orderMap.set(id, swapIdx);
    orderMap.set(listed[swapIdx].id, idx);
    const now = new Date().toISOString();
    const goals = all.map((g) =>
      g.archived || g.deletedAt
        ? g
        : { ...g, order: orderMap.get(g.id) ?? 0, updatedAt: now },
    );
    set({ goals });
    persistGoals(goals);
  },

  addProgress: (id, delta, note, at) => {
    const goal = get().goals.find((g) => g.id === id);
    if (!goal) return null;
    const next = clamp(goal.current + delta, 0, goal.target);
    const actual = next - goal.current;
    if (actual === 0) return null; // already at bound — no phantom record
    const now = new Date().toISOString();
    const createdAt = at ?? now;
    const record: ProgressRecord = {
      id: createId(),
      goalId: id,
      value: actual,
      note,
      createdAt,
      ...(at ? { backfilled: true } : {}),
    };
    const goals = get().goals.map((g) =>
      g.id === id
        ? {
            ...g,
            current: next,
            updatedAt: now,
            // 首次达成记下时间;回落到未完成则清除,供回顾页/成就使用
            completedAt: next >= goal.target ? (g.completedAt ?? createdAt) : undefined,
          }
        : g,
    );
    const history = sortNewestFirst([record, ...get().history]); // 补打卡的 at 可能早于已有记录,统一排一次
    const byGoal = { ...get().byGoal, [id]: sortNewestFirst([record, ...(get().byGoal[id] ?? EMPTY)]) };
    set({ goals, history, byGoal });
    persistBoth(goals, history);
    return record.id;
  },

  removeRecord: (goalId, recordId) => {
    const goal = get().goals.find((g) => g.id === goalId);
    const record = get().history.find((r) => r.id === recordId);
    if (!goal || !record) return;
    const next = clamp(goal.current - record.value, 0, goal.target);
    const now = new Date().toISOString();
    const goals = get().goals.map((g) =>
      g.id === goalId
        ? { ...g, current: next, updatedAt: now, completedAt: next >= goal.target ? g.completedAt : undefined }
        : g,
    );
    const history = get().history.filter((r) => r.id !== recordId);
    const { [goalId]: _removed, ...byGoal } = get().byGoal;
    const remaining = history.filter((r) => r.goalId === goalId);
    set({ goals, history, byGoal: remaining.length ? { ...byGoal, [goalId]: remaining } : byGoal });
    persistBoth(goals, history);
  },
}));
