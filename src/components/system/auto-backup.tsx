"use client";

import { useEffect } from "react";
import { useGoalStore } from "@/store/goal.store";
import { needsAutoBackup, runAutoBackup } from "@/lib/backup";

/** App 启动后检查是否该自动备份(Android 每 7 天一次);失败不阻塞,下次启动重试。 */
export function AutoBackup() {
  const hydrated = useGoalStore((s) => s.hydrated);
  useEffect(() => {
    if (!hydrated || !needsAutoBackup()) return;
    void runAutoBackup();
  }, [hydrated]);
  return null;
}
