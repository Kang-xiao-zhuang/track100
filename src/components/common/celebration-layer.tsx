"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useGoalStore } from "@/store/goal.store";
import { useSettingsStore } from "@/store/settings.store";
import { useT } from "@/lib/i18n";
import { isComplete } from "@/utils/progress";
import { detectNewlyUnlocked, isFirstCelebrationRun } from "@/lib/achievement-celebration";
import { playCheckinFeedback } from "@/lib/haptics";
import type { Badge } from "@/utils/achievements";

interface Celebration {
  key: string;
  kind: "achievement" | "goal";
  icon: string;
  title: string;
  detail: string;
  label: string;
}

/** 全局庆祝层：成就解锁 + 目标达成，共用一张卡，逐条播放、可点关闭。 */
export function CelebrationLayer() {
  const hydrated = useGoalStore((s) => s.hydrated);
  const goals = useGoalStore((s) => s.goals);
  const history = useGoalStore((s) => s.history);
  const lang = useSettingsStore((s) => s.language);
  const { t } = useT();
  const [queue, setQueue] = useState<Celebration[]>([]);
  const current = queue[0] ?? null;
  // 首次 hydrated 时记录已完成目标集合，之后只庆祝「新达成」，刷新不重播。
  const completedRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    const completeIds = new Set(goals.filter(isComplete).map((g) => g.id));
    if (completedRef.current === null) {
      completedRef.current = completeIds;
      // 首次运行不追溯弹成就卡，只静默写记录。
      if (isFirstCelebrationRun()) detectNewlyUnlocked(goals, history);
      return;
    }
    const events: Celebration[] = [];

    // 新解锁的成就
    const fresh = detectNewlyUnlocked(goals, history);
    for (const b of fresh) events.push(badgeCelebration(b, t, lang));

    // 新达成的目标（首次达成，completedAt 刚出现）
    for (const g of goals) {
      if (completeIds.has(g.id) && !completedRef.current.has(g.id)) {
        events.push({
          key: `goal-${g.id}`,
          kind: "goal",
          icon: g.icon,
          title: g.title,
          detail: t("celebrate.goalDetail", { n: g.target, unit: t("u." + g.unit) }),
          label: t("celebrate.goal"),
        });
      }
    }
    completedRef.current = completeIds;
    if (events.length) setQueue((q) => [...q, ...events]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, goals, history]);

  // 每条庆祝:成功震动 + 定时自动收起
  useEffect(() => {
    if (!current) return;
    void playCheckinFeedback("complete");
    const timer = setTimeout(() => setQueue((q) => q.slice(1)), 3200);
    return () => clearTimeout(timer);
  }, [current?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center px-8">
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setQueue((q) => q.slice(1))}
          />
        )}
        {current && (
          <motion.div
            key={current.key}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 360, damping: 26 }}
            className="pointer-events-auto relative w-full max-w-[300px] overflow-hidden rounded-[28px] border border-primary/20 bg-surface px-7 py-8 text-center shadow-hover"
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10" />
            <div className="absolute -bottom-8 -left-6 h-24 w-24 rounded-full bg-warning/10" />
            <button
              onClick={() => setQueue((q) => q.slice(1))}
              aria-label={t("common.close")}
              className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full text-text-secondary/60 active:bg-border/50"
            >
              <X size={15} />
            </button>
            <motion.div
              initial={{ scale: 0.4, rotate: -12 }}
              animate={{ scale: [0.4, 1.12, 1], rotate: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative text-6xl leading-none"
            >
              {current.icon}
            </motion.div>
            <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              <Sparkles size={12} /> {current.label}
            </div>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-text-primary">{current.title}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{current.detail}</p>
            <div className="mx-auto mt-5 h-1 w-12 overflow-hidden rounded-full bg-border/50">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 3.2, ease: "linear" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function badgeCelebration(
  b: Badge,
  t: (key: string, params?: Record<string, string | number>) => string,
  lang: string,
): Celebration {
  void lang;
  return {
    key: `badge-${b.id}`,
    kind: "achievement",
    icon: b.icon,
    title: t(`b.${b.id}.t`),
    detail: t(`b.${b.id}.d`),
    label: t("celebrate.achievement"),
  };
}
