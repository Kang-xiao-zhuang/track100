import { create } from "zustand";
import type { GrowthMode, HomeView, Settings } from "@/types/goal";
import { STORAGE_KEYS, readJSON, writeJSON } from "@/lib/storage";
import { syncStatusBar } from "@/lib/native";
import { accentVars } from "@/lib/accent";

const DEFAULTS: Settings = {
  theme: "light",
  accentHue: null,
  accentSat: null,
  accentLight: null,
  oneTapEnabled: true,
  growthMode: "grid",
  homeView: "classic",
  language: "zh",
};

interface SettingsState extends Settings {
  hydrated: boolean;
  hydrate: () => void;
  toggleTheme: () => void;
  /** hue 为 null = 恢复默认；sat/light 为 0..1 的 HSL 值。 */
  setAccentColor: (hue: number | null, sat?: number | null, light?: number | null) => void;
  setGrowthMode: (mode: GrowthMode) => void;
  setHomeView: (view: HomeView) => void;
  toggleOneTap: () => void;
  toggleLanguage: () => void;
}

function applyTheme(
  theme: Settings["theme"],
  accentHue?: number | null,
  accentSat?: number | null,
  accentLight?: number | null
) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  // 自定义主题色:运行时重写两个 CSS 变量;缺省/默认时清除内联值,回落到 globals.css 的橄榄绿。
  const root = document.documentElement.style;
  if (accentHue == null || !Number.isFinite(accentHue)) {
    root.removeProperty("--primary");
    root.removeProperty("--primary-hover");
  } else {
    const vars = accentVars(accentHue, theme, accentSat, accentLight);
    root.setProperty("--primary", vars.primary);
    root.setProperty("--primary-hover", vars.hover);
  }
  syncStatusBar(theme).catch(() => {});
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  // 把当前全部设置写回 localStorage(避免某个动作漏掉新增字段)
  const persist = () => {
    const { theme, accentHue, accentSat, accentLight, oneTapEnabled, growthMode, homeView, language } = get();
    writeJSON<Settings>(STORAGE_KEYS.settings, {
      theme, accentHue, accentSat, accentLight, oneTapEnabled, growthMode, homeView, language,
    });
  };

  return {
    ...DEFAULTS,
    hydrated: false,

    hydrate: () => {
      if (get().hydrated) return;
      const s = readJSON<Settings>(STORAGE_KEYS.settings, DEFAULTS);
      // 旧设置里可能残留提醒字段,展开时一并带入内存(无 UI 消费,不影响使用),下次任一设置变更即被 persist 清掉。
      set({ ...DEFAULTS, ...s, hydrated: true });
      applyTheme(s.theme ?? DEFAULTS.theme, s.accentHue, s.accentSat, s.accentLight);
    },

    toggleTheme: () => {
      const theme = get().theme === "dark" ? "light" : "dark";
      set({ theme });
      // 同一 hue 在深浅下明度不同,必须重新派生。
      applyTheme(theme, get().accentHue, get().accentSat, get().accentLight);
      persist();
    },

    setAccentColor: (accentHue, accentSat = null, accentLight = null) => {
      set({ accentHue, accentSat, accentLight });
      applyTheme(get().theme, accentHue, accentSat, accentLight);
      persist();
    },

    setGrowthMode: (growthMode) => {
      set({ growthMode });
      persist();
    },

    setHomeView: (homeView) => {
      set({ homeView });
      persist();
    },

    toggleOneTap: () => {
      set((s) => ({ oneTapEnabled: !(s.oneTapEnabled ?? true) }));
      persist();
    },

    toggleLanguage: () => {
      set({ language: get().language === "zh" ? "en" : "zh" });
      persist();
    },
  };
});
