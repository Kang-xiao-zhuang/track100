import { create } from "zustand";
import type { GrowthMode, HomeView, Settings } from "@/types/goal";
import { STORAGE_KEYS, readJSON, writeJSON } from "@/lib/storage";
import { syncStatusBar } from "@/lib/native";
import { accentVars } from "@/lib/accent";
import { MAX_REMINDER_SLOTS, normalizeReminderTimes } from "@/lib/reminder-schedule";

const DEFAULT_TIME = "20:00";
const DEFAULTS: Settings = {
  theme: "light",
  accentHue: null,
  accentSat: null,
  accentLight: null,
  oneTapEnabled: true,
  growthMode: "grid",
  homeView: "classic",
  language: "zh",
  reminderEnabled: false,
  reminderTime: DEFAULT_TIME,
  reminderTimes: [DEFAULT_TIME],
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
  setReminder: (enabled: boolean, time?: string) => void;
  /** 用完整的时段列表替换(设置页增删时段时用)。 */
  setReminderTimes: (times: string[]) => void;
  /** 新增一个时段(返回是否成功,受 MAX_REMINDER_SLOTS 限制)。 */
  addReminderTime: (time?: string) => boolean;
  /** 删除指定下标的时段(至少保留一个)。 */
  removeReminderTime: (index: number) => void;
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
    const { theme, accentHue, accentSat, accentLight, oneTapEnabled, growthMode, homeView, language, reminderEnabled, reminderTime, reminderTimes } = get();
    writeJSON<Settings>(STORAGE_KEYS.settings, {
      theme, accentHue, accentSat, accentLight, oneTapEnabled, growthMode, homeView, language, reminderEnabled, reminderTime, reminderTimes,
    });
  };
  // reminderTime 始终是 times[0],两者保持一致。
  const withTimes = (times: string[]) => {
    const norm = normalizeReminderTimes(times);
    return { reminderTimes: norm, reminderTime: norm[0] };
  };

  return {
    ...DEFAULTS,
    hydrated: false,

    hydrate: () => {
      if (get().hydrated) return;
      const s = readJSON<Settings>(STORAGE_KEYS.settings, DEFAULTS);
      // 旧设置只有 reminderTime:把它作为唯一的时段
      const times = normalizeReminderTimes(s.reminderTimes ?? [s.reminderTime ?? DEFAULT_TIME]);
      set({ ...DEFAULTS, ...s, ...withTimes(times), hydrated: true });
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

    setReminder: (enabled, time) => {
      set((state) => {
        if (!time) return { reminderEnabled: enabled };
        // 改主时段:替换 times[0]
        const times = [...(state.reminderTimes ?? [state.reminderTime])];
        times[0] = time;
        return { reminderEnabled: enabled, ...withTimes(times) };
      });
      persist();
    },

    setReminderTimes: (times) => {
      set(withTimes(times));
      persist();
    },

    addReminderTime: (time = "08:00") => {
      const cur = get().reminderTimes ?? [get().reminderTime];
      if (cur.length >= MAX_REMINDER_SLOTS) return false;
      set(withTimes([...cur, time]));
      persist();
      return true;
    },

    removeReminderTime: (index) => {
      const cur = get().reminderTimes ?? [get().reminderTime];
      if (cur.length <= 1) return;
      set(withTimes(cur.filter((_, i) => i !== index)));
      persist();
    },
  };
});
