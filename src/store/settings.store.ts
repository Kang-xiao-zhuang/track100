import { create } from "zustand";
import type { GrowthMode, Settings } from "@/types/goal";
import { STORAGE_KEYS, readJSON, writeJSON } from "@/lib/storage";

const DEFAULTS: Settings = { theme: "light", growthMode: "grid", language: "zh" };

interface SettingsState extends Settings {
  hydrated: boolean;
  hydrate: () => void;
  toggleTheme: () => void;
  setGrowthMode: (mode: GrowthMode) => void;
  toggleLanguage: () => void;
}

function apply(theme: Settings["theme"]) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function save(s: Settings) {
  writeJSON(STORAGE_KEYS.settings, s);
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    const s = readJSON<Settings>(STORAGE_KEYS.settings, DEFAULTS);
    set({ ...s, hydrated: true });
    apply(s.theme);
  },

  toggleTheme: () => {
    const theme = get().theme === "dark" ? "light" : "dark";
    set({ theme });
    apply(theme);
    save({ theme, growthMode: get().growthMode, language: get().language });
  },

  setGrowthMode: (growthMode) => {
    set({ growthMode });
    save({ theme: get().theme, growthMode, language: get().language });
  },

  toggleLanguage: () => {
    const language = get().language === "zh" ? "en" : "zh";
    set({ language });
    save({ theme: get().theme, growthMode: get().growthMode, language });
  },
}));
