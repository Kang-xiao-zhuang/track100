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
  /** 连续打卡次数(在撤销条存活期内再次打卡累加),用于「连击」提示。 */
  combo: number;
  lastAt: number;
  show: (toast: CheckinToast) => void;
  clear: () => void;
  markUndone: () => void;
}

const COMBO_WINDOW = 6000;

export const useCheckinStore = create<CheckinState>((set) => ({
  toast: null,
  justUndone: false,
  combo: 0,
  lastAt: 0,
  show: (toast) =>
    set((s) => {
      const now = Date.now();
      const chained = !!s.toast && now - s.lastAt < COMBO_WINDOW;
      return { toast, justUndone: false, combo: chained ? s.combo + 1 : 1, lastAt: now };
    }),
  clear: () => set({ toast: null, justUndone: false, combo: 0, lastAt: 0 }),
  markUndone: () => set({ toast: null, justUndone: true, combo: 0, lastAt: 0 }),
}));
