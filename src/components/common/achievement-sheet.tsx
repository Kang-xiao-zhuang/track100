"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import type { Badge } from "@/utils/achievements";

/**
 * 成就详情底部面板。成就行在手机上只能显示图标,点开看名称/说明/进度。
 * z-50 盖过底部导航(z-40);左右箭头切换,点遮罩/ESC 关闭。
 */
export function AchievementSheet({
  badges,
  index,
  onClose,
  onChange,
}: {
  badges: Badge[];
  index: number | null;
  onClose: () => void;
  onChange: (index: number) => void;
}) {
  const { t } = useT();
  const open = index !== null;
  const badge = open ? badges[index] : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index! > 0) onChange(index! - 1);
      if (e.key === "ArrowRight" && index! < badges.length - 1) onChange(index! + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, badges.length, onClose, onChange]);

  const target = badge?.target ?? 0;
  const pct = target > 0 ? Math.min(100, Math.round(((badge?.current ?? 0) / target) * 100)) : null;

  return (
    <AnimatePresence>
      {open && badge && (
        <motion.div
          className="fixed inset-0 z-50 mx-auto flex max-w-app items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative w-full rounded-t-[28px] border-t border-border bg-surface px-5 pb-8 pt-3 shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />

            <div className="relative flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-text-secondary">{t("stats.achievements")}</span>
              <button aria-label={t("common.close")} onClick={onClose} className="rounded-full p-1.5 text-text-secondary active:bg-border/60">
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 flex flex-col items-center text-center">
              <div
                className={cn(
                  "flex h-24 w-24 items-center justify-center rounded-3xl border text-5xl",
                  badge.unlocked ? "border-primary/30 bg-primary/10" : "border-border bg-border/30 grayscale opacity-50",
                )}
              >
                {badge.icon}
              </div>
              <div className="mt-4 text-xl font-semibold tracking-tight text-text-primary">{t(`b.${badge.id}.t`)}</div>
              <div className={cn("mt-1 text-xs font-medium", badge.unlocked ? "text-primary" : "text-text-secondary")}>
                {badge.unlocked ? t("badge.unlocked") : t("badge.locked")}
              </div>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-text-secondary">{t(`b.${badge.id}.d`)}</p>

              {pct !== null && (
                <div className="mt-6 w-full max-w-xs">
                  <div className="mb-1.5 flex justify-between text-xs text-text-secondary">
                    <span>{t("badge.progress")}</span>
                    <span className="tabular-nums">
                      {Math.min(badge?.current ?? 0, target)} / {target}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-border/60">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-7 flex items-center justify-between">
              <button
                aria-label={t("badge.prev")}
                disabled={index! <= 0}
                onClick={() => onChange(index! - 1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary active:bg-border/60 disabled:opacity-30"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-xs tabular-nums text-text-secondary">{index! + 1} / {badges.length}</span>
              <button
                aria-label={t("badge.next")}
                disabled={index! >= badges.length - 1}
                onClick={() => onChange(index! + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary active:bg-border/60 disabled:opacity-30"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
