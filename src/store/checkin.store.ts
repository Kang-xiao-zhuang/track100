import { create } from "zustand";
import type { GoalUnit } from "@/types/goal";

/** 一次可撤销的打卡。首页快捷 +1、详情页打卡、通知栏打卡共用。 */
export interface CheckinToast {
  goalId: string;
  recordId: string;
  value: number;
  unit: GoalUnit;
}

interface CheckinState {
  toast: CheckinToast | null;
  justUndone: boolean;
  show: (toast: CheckinToast) => void;
  clear: () => void;
  markUndone: () => void;
}

export const useCheckinStore = create<CheckinState>((set) => ({
  toast: null,
  justUndone: false,
  show: (toast) => set({ toast, justUndone: false }),
  clear: () => set({ toast: null, justUndone: false }),
  markUndone: () => set({ toast: null, justUndone: true }),
}));
