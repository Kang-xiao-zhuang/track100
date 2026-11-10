// Backup / restore 的唯一出口:校验导入、按 id 合并、导入前快照、Android 自动备份。
// 设计原则:导入永不覆盖用户已有数据;任何批量写入前都留一份可一键回滚的快照。
import { z } from "zod";
import type { Achievement, Goal, ProgressRecord, Settings } from "@/types/goal";
import { STORAGE_KEYS, flushWrites, readJSON, writeJSON } from "@/lib/storage";
import { sortNewestFirst } from "@/utils/history";
import { dayKey } from "@/utils/date";
import { isNative } from "@/lib/native";

export const BACKUP_VERSION = 2;
const AUTO_BACKUP_DAYS = 7;
const AUTO_BACKUP_KEEP = 3;
const DAY = 86400000;

// 校验只约束会被引擎读取的字段;passthrough 让旧版/未来字段都能通过。
const goalSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    icon: z.string(),
    color: z.string(),
    category: z.enum(["learning", "health", "work", "life", "finance", "fitness", "other"]),
    unit: z.enum(["hours", "days", "books", "times", "km", "pages", "custom"]),
    target: z.number().positive(),
    current: z.number().min(0),
    step: z.number().positive(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    archived: z.boolean(),
    description: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    deletedAt: z.string().optional(),
    completedAt: z.string().optional(),
    // v2 的可选扩展:习惯型目标与首页排序。旧备份没有这些字段,导入后按累计型/默认顺序处理。
    type: z.enum(["cumulative", "habit"]).optional(),
    habitPeriod: z.enum(["daily", "weekly"]).optional(),
    order: z.number().optional(),
  })
  .passthrough();

const recordSchema = z
  .object({
    id: z.string().min(1),
    goalId: z.string().min(1),
    value: z.number(),
    createdAt: z.string().min(1),
    note: z.string().optional(),
    backfilled: z.boolean().optional(),
  })
  .passthrough();

const settingsSchema = z
  .object({
    theme: z.enum(["light", "dark"]).optional(),
    growthMode: z.enum(["grid", "ring", "bar", "tree", "heatmap"]).optional(),
    language: z.enum(["zh", "en"]).optional(),
    reminderEnabled: z.boolean().optional(),
    reminderTime: z.string().optional(),
  })
  .passthrough()
  .optional();

const achievementSchema = z
  .object({ id: z.string().min(1), title: z.string(), description: z.string(), icon: z.string(), completed: z.boolean() })
  .passthrough();

const backupSchema = z.object({
  app: z.literal("track100"),
  version: z.number().optional(),
  exportedAt: z.string().optional(),
  goals: z.array(goalSchema),
  history: z.array(recordSchema),
  settings: settingsSchema,
  achievements: z.array(achievementSchema).optional(),
});

// 对外用领域类型(而非 z.infer):passthrough 会带 index signature,与 Goal/ProgressRecord 不兼容。
// parseBackup 已校验核心字段,解析结果可安全视作 BackupData。
export interface BackupData {
  app: "track100";
  version?: number;
  exportedAt?: string;
  goals: Goal[];
  history: ProgressRecord[];
  settings?: Partial<Settings>;
  achievements?: Achievement[];
}

/** 生成当前数据的备份对象(readJSON 会读到尚未落盘的最新值)。 */
export function buildBackup(): BackupData {
  return {
    app: "track100",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    goals: readJSON<Goal[]>(STORAGE_KEYS.goals, []),
    history: readJSON<ProgressRecord[]>(STORAGE_KEYS.history, []),
    settings: readJSON<Partial<Settings>>(STORAGE_KEYS.settings, {}),
    achievements: readJSON<Achievement[]>(STORAGE_KEYS.achievements, []),
  };
}

/** 解析并严格校验;失败抛出的 message 是 i18n key。 */
export function parseBackup(text: string): BackupData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("import.invalid");
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) throw new Error("import.invalid");
  return parsed.data as unknown as BackupData;
}

interface Snapshot {
  at: string;
  goals: Goal[];
  history: ProgressRecord[];
  settings: unknown;
  achievements: unknown;
}

/** 批量写入前留一份本机快照(防误导入/误操作,不防卸载)。 */
export function takeSnapshot(): void {
  writeJSON<Snapshot>(STORAGE_KEYS.snapshot, {
    at: new Date().toISOString(),
    goals: readJSON<Goal[]>(STORAGE_KEYS.goals, []),
    history: readJSON<ProgressRecord[]>(STORAGE_KEYS.history, []),
    settings: readJSON<unknown>(STORAGE_KEYS.settings, {}),
    achievements: readJSON<unknown>(STORAGE_KEYS.achievements, []),
  });
}

export function snapshotAt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.snapshot);
    if (!raw) return null;
    return (JSON.parse(raw) as Snapshot).at ?? null;
  } catch {
    return null;
  }
}

/** 一键回滚到最近一次快照。 */
export function restoreSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.snapshot);
    if (!raw) return false;
    const s = JSON.parse(raw) as Snapshot;
    writeJSON(STORAGE_KEYS.goals, s.goals ?? []);
    writeJSON(STORAGE_KEYS.history, s.history ?? []);
    if (s.settings !== undefined) writeJSON(STORAGE_KEYS.settings, s.settings);
    writeJSON(STORAGE_KEYS.achievements, s.achievements ?? []);
    flushWrites();
    return true;
  } catch {
    return false;
  }
}

export interface MergeResult {
  addedGoals: number;
  addedRecords: number;
}

/**
 * 按 id 合并而非覆盖:
 * - goals:同 id 取 updatedAt 较新者(软删除也是一次更新,不会被旧备份"复活")
 * - history:按 id 并集,重新排序
 * - settings:刻意忽略(主题/语言/提醒是设备偏好)
 */
export function mergeBackup(data: BackupData): MergeResult {
  takeSnapshot();
  const goalMap = new Map(readJSON<Goal[]>(STORAGE_KEYS.goals, []).map((g) => [g.id, g]));
  let addedGoals = 0;
  for (const g of data.goals) {
    const cur = goalMap.get(g.id);
    if (!cur) {
      goalMap.set(g.id, g);
      addedGoals++;
    } else if ((g.updatedAt ?? "") > (cur.updatedAt ?? "")) {
      goalMap.set(g.id, g);
    }
  }

  const recMap = new Map(readJSON<ProgressRecord[]>(STORAGE_KEYS.history, []).map((r) => [r.id, r]));
  let addedRecords = 0;
  for (const r of data.history) {
    if (!recMap.has(r.id)) {
      recMap.set(r.id, r);
      addedRecords++;
    }
  }

  const achMap = new Map(readJSON<Achievement[]>(STORAGE_KEYS.achievements, []).map((a) => [a.id, a]));
  for (const a of data.achievements ?? []) if (!achMap.has(a.id)) achMap.set(a.id, a);

  writeJSON(STORAGE_KEYS.goals, [...goalMap.values()]);
  writeJSON(STORAGE_KEYS.history, sortNewestFirst([...recMap.values()]));
  writeJSON(STORAGE_KEYS.achievements, [...achMap.values()]);
  flushWrites();
  return { addedGoals, addedRecords };
}

export function autoBackupStatus(): { supported: boolean; at: number } {
  return { supported: isNative(), at: readJSON<number>(STORAGE_KEYS.lastAutoBackup, 0) };
}

export function needsAutoBackup(): boolean {
  if (!isNative()) return false; // Web 端无法静默写文件,避免反复空跑
  return Date.now() - autoBackupStatus().at >= AUTO_BACKUP_DAYS * DAY;
}

/**
 * Android:把备份写到公共 Documents/track100/(卸载 App 后仍保留),保留最近 3 份。
 * 分区存储受限时返回 false,由设置页提示用户手动导出。Web 端恒为 false。
 */
export async function runAutoBackup(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
    const dir = "track100";
    const filename = `track100-auto-${dayKey(new Date())}.json`;
    await Filesystem.writeFile({
      path: `${dir}/${filename}`,
      data: JSON.stringify(buildBackup()),
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    try {
      const { files } = await Filesystem.readdir({ path: dir, directory: Directory.Documents });
      const names = files
        .map((f) => (typeof f === "string" ? f : f.name ?? ""))
        .filter((n) => /^track100-auto-\d{4}-\d{2}-\d{2}\.json$/.test(n))
        .sort();
      for (const n of names.slice(0, Math.max(0, names.length - AUTO_BACKUP_KEEP))) {
        await Filesystem.deleteFile({ path: `${dir}/${n}`, directory: Directory.Documents });
      }
    } catch {
      // 清理失败不影响本次备份成功
    }
    writeJSON(STORAGE_KEYS.lastAutoBackup, Date.now());
    flushWrites();
    return true;
  } catch {
    return false;
  }
}
