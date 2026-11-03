import { create } from "zustand";
import type { GrowthMode, Settings } from "@/types/goal";
import { STORAGE_KEYS, readJSON, writeJSON } from "@/lib/storage";
import { syncStatusBar } from "@/lib/native";

const DEFAULTS: Settings = {
  theme: "light",
  growthMode: "grid",
  language: "zh",
  reminderEnabled: false,
  reminderTime: "20:00",
};

interface SettingsState extends Settings {
  hydrated: boolean;
  hydrate: () => void;
  toggleTheme: () => void;
  setGrowthMode: (mode: GrowthMode) => void;
  toggleLanguage: () => void;
  setReminder: (enabled: boolean, time?: string) => void;
}

function applyTheme(theme: Settings["theme"]) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  syncStatusBar(theme).catch(() => {});
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  // 把当前全部设置写回 localStorage(避免某个动作漏掉新增字段)
  const persist = () => {
    const { theme, growthMode, language, reminderEnabled, reminderTime } = get();
    writeJSON<Settings>(STORAGE_KEYS.settings, { theme, growthMode, language, reminderEnabled, reminderTime });
  };

  return {
    ...DEFAULTS,
    hydrated: false,

    hydrate: () => {
      if (get().hydrated) return;
      const s = readJSON<Settings>(STORAGE_KEYS.settings, DEFAULTS);
      set({ ...DEFAULTS, ...s, hydrated: true });
      applyTheme(s.theme ?? DEFAULTS.theme);
    },

    toggleTheme: () => {
      const theme = get().theme === "dark" ? "light" : "dark";
      set({ theme });
      applyTheme(theme);
      persist();
    },

    setGrowthMode: (growthMode) => {
      set({ growthMode });
      persist();
    },

    toggleLanguage: () => {
      set({ language: get().language === "zh" ? "en" : "zh" });
      persist();
    },

    setReminder: (enabled, time) => {
      set({ reminderEnabled: enabled, ...(time ? { reminderTime: time } : {}) });
      persist();
    },
  };
});
