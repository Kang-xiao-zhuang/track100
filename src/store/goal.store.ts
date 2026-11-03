import { create } from "zustand";
import type { Goal, ProgressRecord } from "@/types/goal";
import { STORAGE_KEYS, flushWrites, readJSON, writeJSON, writeJSONDeferred } from "@/lib/storage";
import { createId } from "@/lib/id";
import { indexByGoal, sortNewestFirst } from "@/utils/history";

export type GoalInput = Omit<Goal, "id" | "current" | "createdAt" | "updatedAt" | "archived"> &
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
  deleteGoal: (id: string) => void;
  addProgress: (id: string, delta: number, note?: string) => void;
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
    const goals = get().goals.filter((g) => g.id !== id);
    const history = get().history.filter((r) => r.goalId !== id);
    const { [id]: _removed, ...byGoal } = get().byGoal;
    set({ goals, history, byGoal });
    persistBoth(goals, history);
  },

  addProgress: (id, delta, note) => {
    const goal = get().goals.find((g) => g.id === id);
    if (!goal) return;
    const next = clamp(goal.current + delta, 0, goal.target);
    const actual = next - goal.current;
    if (actual === 0) return; // already at bound — no phantom record
    const now = new Date().toISOString();
    const goals = get().goals.map((g) => (g.id === id ? { ...g, current: next, updatedAt: now } : g));
    const record: ProgressRecord = { id: createId(), goalId: id, value: actual, note, createdAt: now };
    const history = [record, ...get().history];
    const byGoal = { ...get().byGoal, [id]: [record, ...(get().byGoal[id] ?? EMPTY)] };
    set({ goals, history, byGoal });
    persistBoth(goals, history);
  },
}));
