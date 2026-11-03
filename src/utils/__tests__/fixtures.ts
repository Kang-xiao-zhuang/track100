import type { Goal, ProgressRecord } from "@/types/goal";

export function makeGoal(over: Partial<Goal> = {}): Goal {
  return {
    id: "g1",
    title: "读书",
    icon: "📚",
    color: "#556B2F",
    category: "learning",
    unit: "books",
    target: 100,
    current: 0,
    step: 1,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    archived: false,
    ...over,
  };
}

let seq = 0;
export function rec(createdAt: string, value = 1, goalId = "g1"): ProgressRecord {
  return { id: `r${++seq}`, goalId, value, createdAt };
}
