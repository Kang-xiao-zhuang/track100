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

// 延迟写:打卡记录可能有几千条,每点一次都整串 JSON 写回会卡。
// 连续操作合并成一次写入;App 切到后台 / 页面关闭时立即落盘。
const WRITE_DELAY = 300;
const pending = new Map<string, unknown>();
let timer: ReturnType<typeof setTimeout> | null = null;
let listening = false;

export function flushWrites(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  const entries = [...pending];
  pending.clear();
  for (const [key, value] of entries) writeJSON(key, value);
}

export function writeJSONDeferred<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  if (!listening) {
    listening = true;
    window.addEventListener("pagehide", flushWrites);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushWrites();
    });
  }
  pending.set(key, value);
  timer ??= setTimeout(flushWrites, WRITE_DELAY);
}

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  if (pending.has(key)) return pending.get(key) as T; // 尚未落盘的最新值
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
  pending.delete(key); // 直接写(如导入备份)覆盖排队中的旧值,避免稍后被冲掉
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / unavailable — fail silently, UI state still holds this session
  }
}
