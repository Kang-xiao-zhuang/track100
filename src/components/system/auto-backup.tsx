"use client";

import { useEffect } from "react";
import { useGoalStore } from "@/store/goal.store";
import { needsAutoBackup, runAutoBackup } from "@/lib/backup";

/** App 启动后检查是否该自动备份(Android 每 7 天一次);失败不阻塞,下次启动重试。 */
export function AutoBackup() {
  const hydrated = useGoalStore((s) => s.hydrated);
  const recordCount = useGoalStore((s) => s.history.length);
  useEffect(() => {
    if (!hydrated || !needsAutoBackup()) return;
    void runAutoBackup();
    // 启动时 + 每次打卡(记录数变化)都检查一次;needsAutoBackup 内部按 7 天节流,
    // 不会真的每次打卡都写盘,只保证「攒够间隔后的下一次打卡」能静默落盘。
  }, [hydrated, recordCount]);
  return null;
}
