import type { Goal, ProgressRecord } from "@/types/goal";
import { achievements } from "@/utils/achievements";
import { STORAGE_KEYS, readJSON, writeJSON } from "@/lib/storage";

/**
 * 成就解锁检测：只在「本次会话里首次出现已解锁成就」时返回需要庆祝的成就。
 * 已庆祝过的 id 落在 localStorage,避免刷新/重开重复弹卡。
 * 首次运行(没有记录)时把当前已解锁的都标记为已庆祝,不追溯弹卡。
 */
export function detectNewlyUnlocked(
  goals: Goal[],
  history: ProgressRecord[],
): ReturnType<typeof achievements> {
  const unlocked = achievements(goals, history).filter((b) => b.unlocked);
  if (unlocked.length === 0) return [];

  const seen = readJSON<string[]>(STORAGE_KEYS.celebratedAchievements, []);
  const fresh = unlocked.filter((b) => !seen.includes(b.id));
  // 合并去重后写回;即便是首次运行也只是静默记下,不弹卡(见 noCelebrateOnFirstRun 的说明)。
  writeJSON(STORAGE_KEYS.celebratedAchievements, [...new Set([...seen, ...unlocked.map((b) => b.id)])]);
  return fresh;
}

/** 是否首次运行(此前从未记录过已庆祝成就)。首次运行不弹追溯卡。 */
export function isFirstCelebrationRun(): boolean {
  return readJSON<string[] | null>(STORAGE_KEYS.celebratedAchievements, null) === null;
}
