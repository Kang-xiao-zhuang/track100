import { create } from "zustand";
import type { Goal, ProgressRecord } from "@/types/goal";
import { STORAGE_KEYS, readJSON, writeJSON } from "@/lib/storage";
import { createId } from "@/lib/id";

export type GoalInput = Omit<Goal, "id" | "current" | "createdAt" | "updatedAt" | "archived"> &
  Partial<Pick<Goal, "current">>;

interface GoalState {
  goals: Goal[];
  history: ProgressRecord[];
  hydrated: boolean;
  hydrate: () => void;
  getGoal: (id: string) => Goal | undefined;
  historyOf: (id: string) => ProgressRecord[];
  createGoal: (input: GoalInput) => Goal;
  updateGoal: (id: string, patch: Partial<GoalInput>) => void;
  deleteGoal: (id: string) => void;
  addProgress: (id: string, delta: number, note?: string) => void;
}

function persist(goals: Goal[], history: ProgressRecord[]) {
  writeJSON(STORAGE_KEYS.goals, goals);
  writeJSON(STORAGE_KEYS.history, history);
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  history: [],
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    set({
      goals: readJSON<Goal[]>(STORAGE_KEYS.goals, []),
      history: readJSON<ProgressRecord[]>(STORAGE_KEYS.history, []),
      hydrated: true,
    });
  },

  getGoal: (id) => get().goals.find((g) => g.id === id),
  historyOf: (id) =>
    get()
      .history.filter((r) => r.goalId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

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
    persist(goals, get().history);
    return goal;
  },

  updateGoal: (id, patch) => {
    const goals = get().goals.map((g) =>
      g.id === id ? { ...g, ...patch, updatedAt: new Date().toISOString() } : g,
    );
    set({ goals });
    persist(goals, get().history);
  },

  deleteGoal: (id) => {
    const goals = get().goals.filter((g) => g.id !== id);
    const history = get().history.filter((r) => r.goalId !== id);
    set({ goals, history });
    persist(goals, history);
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
    set({ goals, history });
    persist(goals, history);
  },
}));
