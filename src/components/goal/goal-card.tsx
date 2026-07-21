"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Goal } from "@/types/goal";
import { categoryLabel, unitLabel } from "@/lib/goal-meta";
import { percent, remaining, fmt } from "@/utils/progress";
import { ProgressRing } from "@/components/progress/progress-ring";

export function GoalCard({ goal }: { goal: Goal }) {
  const p = percent(goal.current, goal.target);
  const left = remaining(goal);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Link
        href={`/goals/${goal.id}`}
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
            {fmt(goal.current)} / {fmt(goal.target)} {unitLabel(goal.unit)}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-text-secondary">
            <span className="rounded-full bg-border/50 px-2 py-0.5">{categoryLabel(goal.category)}</span>
            {left > 0 ? <span>还差 {fmt(left)} {unitLabel(goal.unit)}</span> : <span className="text-success">已完成 ✓</span>}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
