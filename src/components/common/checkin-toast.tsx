"use client";

import { useEffect, useRef } from "react";
import { useCheckinStore } from "@/store/checkin.store";
import { useGoalStore } from "@/store/goal.store";
import { useT } from "@/lib/i18n";
import { fmt } from "@/utils/progress";

/** 全局打卡撤销条:首页快捷 +1、详情页打卡、通知栏打卡共用同一套反馈。 */
export function CheckinToast() {
  const toast = useCheckinStore((s) => s.toast);
  const justUndone = useCheckinStore((s) => s.justUndone);
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

  if (!toast && !justUndone) return null;

  const onUndo = () => {
    if (!toast) return;
    removeRecord(toast.goalId, toast.recordId);
    markUndone();
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 mx-auto max-w-app px-5">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto mx-auto flex w-fit items-center gap-3 rounded-full border border-border bg-surface px-4 py-2.5 text-sm shadow-hover"
      >
        {justUndone ? (
          <span className="text-text-secondary">{t("undo.removed")}</span>
        ) : (
          <>
            <span className="text-text-primary">
              {t("undo.added", { value: fmt(toast!.value), unit: t("u." + toast!.unit) })}
            </span>
            <button onClick={onUndo} className="font-semibold text-primary underline underline-offset-2">
              {t("undo.action")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
