// Single choke-point for LocalStorage — no component/store touches localStorage directly.
// Keys per docs/07-DATA-MODEL.md.

export const STORAGE_KEYS = {
  goals: "track100-goals",
  history: "track100-history",
  settings: "track100-settings",
  achievements: "track100-achievements",
  lastExport: "track100-last-export",
  lastRemind: "track100-last-remind",
} as const;

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / unavailable — fail silently, UI state still holds this session
  }
}
