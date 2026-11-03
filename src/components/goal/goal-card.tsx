"use client";

import { memo } from "react";
import Link from "next/link";
import { percent, remaining, fmt } from "@/utils/progress";
import { useT } from "@/lib/i18n";
import { ProgressRing } from "@/components/progress/progress-ring";
import type { Goal } from "@/types/goal";

/** Goal card — memoized to skip re-renders when sibling cards change.
 *  Entrance uses CSS animation (GPU-composited) instead of Framer Motion. */
export const GoalCard = memo(function GoalCard({ goal }: { goal: Goal }) {
  const { t } = useT();
  const p = percent(goal.current, goal.target);
  const left = remaining(goal);
  return (
    <div style={{ animation: "fade-up 0.3s both" }}>
      <Link
        href={`/goals?id=${goal.id}`}
        className="flex items-center gap-4 rounded-card border border-border bg-surface p-5 shadow-card transition-shadow hover:shadow-hover"
      >
        <ProgressRing value={goal.target ? goal.current / goal.target : 0} size={64} stroke={7} color={goal.color}>
          <span className="text-lg">{goal.icon}</span>
        </ProgressRing>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate text-base font-semibold text-text-primary">{goal.title}</h3>
            <span className="shrink-0 text-sm font-bold" style={{ color: goal.color }}>
              {p}%
            </span>
          </div>
          <div className="mt-0.5 text-sm text-text-secondary">
            {fmt(goal.current)} / {fmt(goal.target)} {t("u." + goal.unit)}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-text-secondary">
            <span className="rounded-full bg-border/50 px-2 py-0.5">{t("cat." + goal.category)}</span>
            {left > 0 ? (
              <span>{t("left.remaining", { n: fmt(left), unit: t("u." + goal.unit) })}</span>
            ) : (
              <span className="text-success">{t("left.done")}</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
});
