"use client";

import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCheckinStore } from "@/store/checkin.store";
import { useGoalStore } from "@/store/goal.store";
import { useSettingsStore } from "@/store/settings.store";
import { useT } from "@/lib/i18n";
import { cellsLit, fmt, isComplete } from "@/utils/progress";
import { getCheckinCheer } from "@/lib/encouragement";
import { playCheckinFeedback, type CheckinFeedback } from "@/lib/haptics";
import { cn } from "@/lib/cn";

/** 值得重震的累计格子节点;不做每 10 格一次,避免变成噪音。 */
const MILESTONES = new Set([10, 50, 100, 200, 365, 500, 1000]);

/** 全局打卡撤销条:首页快捷 +1、详情页打卡、通知栏打卡、桌面小组件共用同一套反馈。 */
export function CheckinToast() {
  const toast = useCheckinStore((s) => s.toast);
  const justUndone = useCheckinStore((s) => s.justUndone);
  const combo = useCheckinStore((s) => s.combo);
  const clear = useCheckinStore((s) => s.clear);
  const markUndone = useCheckinStore((s) => s.markUndone);
  const removeRecord = useGoalStore((s) => s.removeRecord);
  const goals = useGoalStore((s) => s.goals);
  const lang = useSettingsStore((s) => s.language);
  const { t } = useT();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const litCells = useMemo(
    () => goals.filter((g) => !g.archived && !g.deletedAt).reduce((sum, g) => sum + cellsLit(g.current, g.target), 0),
    [goals],
  );
  const feedback = useMemo((): { level: CheckinFeedback; cheer: string } | null => {
    if (!toast) return null;
    const goal = goals.find((g) => g.id === toast.goalId);
    const completed = !!goal && isComplete(goal);
    const milestone = !completed && MILESTONES.has(litCells);
    return {
      level: completed ? "complete" : milestone ? "milestone" : "tick",
      cheer: getCheckinCheer({ lang, litCells, milestone, completed, goalTitle: goal?.title }),
    };
  }, [toast, goals, lang, litCells]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (toast) timer.current = setTimeout(clear, 5000);
    else if (justUndone) timer.current = setTimeout(clear, 2000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast, justUndone, clear]);

  // 每条新打卡只震一次:连击不会重复触发
  const recordId = toast?.recordId;
  useEffect(() => {
    if (!recordId || !feedback) return;
    void playCheckinFeedback(feedback.level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  const onUndo = () => {
    if (!toast) return;
    removeRecord(toast.goalId, toast.recordId);
    markUndone();
  };

  const showCombo = combo >= 2 && !!toast;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 mx-auto max-w-app px-5">
      <AnimatePresence mode="wait">
        {toast || justUndone ? (
          <motion.div
            key={toast?.recordId ?? "undone"}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="pointer-events-auto relative mx-auto flex w-fit max-w-full items-center gap-3 rounded-full border border-border bg-surface px-4 py-2.5 text-sm shadow-hover"
          >
            {justUndone ? (
              <span className="text-text-secondary">{t("undo.removed")}</span>
            ) : (
              <>
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                  <motion.span
                    key={combo}
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.18, 1] }}
                    transition={{ duration: 0.32 }}
                    className="text-text-primary"
                  >
                    {t("undo.added", { value: fmt(toast!.value), unit: t("u." + toast!.unit) })}
                  </motion.span>
                  {feedback && (
                    <span
                      className={cn(
                        "text-xs",
                        feedback.level === "tick" ? "text-text-secondary" : "font-semibold text-primary",
                      )}
                    >
                      {feedback.cheer}
                    </span>
                  )}
                </div>
                <button onClick={onUndo} className="shrink-0 font-semibold text-primary underline underline-offset-2">
                  {t("undo.action")}
                </button>
                <AnimatePresence>
                  {showCombo && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.4, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: -22 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                      className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-warning px-2.5 py-0.5 text-xs font-bold text-white shadow-hover"
                    >
                      {t("combo.n", { n: combo })}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
