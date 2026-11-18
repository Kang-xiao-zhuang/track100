"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCheckinStore } from "@/store/checkin.store";
import { useGoalStore } from "@/store/goal.store";
import { useT } from "@/lib/i18n";
import { fmt } from "@/utils/progress";

/** 全局打卡撤销条:首页快捷 +1、详情页打卡、通知栏打卡共用同一套反馈。 */
export function CheckinToast() {
  const toast = useCheckinStore((s) => s.toast);
  const justUndone = useCheckinStore((s) => s.justUndone);
  const combo = useCheckinStore((s) => s.combo);
  const clear = useCheckinStore((s) => s.clear);
  const markUndone = useCheckinStore((s) => s.markUndone);
  const removeRecord = useGoalStore((s) => s.removeRecord);
  const { t } = useT();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (toast) timer.current = setTimeout(clear, 5000);
    else if (justUndone) timer.current = setTimeout(clear, 2000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast, justUndone, clear]);

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
            className="pointer-events-auto relative mx-auto flex w-fit items-center gap-3 rounded-full border border-border bg-surface px-4 py-2.5 text-sm shadow-hover"
          >
            {justUndone ? (
              <span className="text-text-secondary">{t("undo.removed")}</span>
            ) : (
              <>
                <motion.span
                  key={combo}
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.18, 1] }}
                  transition={{ duration: 0.32 }}
                  className="text-text-primary"
                >
                  {t("undo.added", { value: fmt(toast!.value), unit: t("u." + toast!.unit) })}
                </motion.span>
                <button onClick={onUndo} className="font-semibold text-primary underline underline-offset-2">
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
