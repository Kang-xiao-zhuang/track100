import { create } from "zustand";
import type { ReminderHealth, ReminderStatus } from "@/lib/native";

/**
 * 提醒的全局可观测状态。
 * PwaReminder 是唯一的排程入口,把结果写进这里;设置页的自检面板订阅后即时显示,
 * 避免「开关显示已开启、实际排程失败」这种静默故障。
 */
interface ReminderState {
  health: ReminderHealth | null;
  lastResult: ReminderStatus | null;
  busy: boolean;
  setHealth: (h: ReminderHealth) => void;
  setLastResult: (r: ReminderStatus | null) => void;
  setBusy: (v: boolean) => void;
}

export const useReminderStore = create<ReminderState>((set) => ({
  health: null,
  lastResult: null,
  busy: false,
  setHealth: (health) => set({ health }),
  setLastResult: (lastResult) => set({ lastResult }),
  setBusy: (busy) => set({ busy }),
}));
