"use client";

import { useState, useEffect } from "react";
import { percent } from "@/utils/progress";
import { useT } from "@/lib/i18n";

interface TreeViewProps {
  current: number;
  total: number;
  color: string;
}

// Growth stages by completion — the goal literally grows as you progress.
const STAGES = [
  { min: 0, emoji: "🌱", key: "tree.seed" },
  { min: 20, emoji: "🌿", key: "tree.sprout" },
  { min: 45, emoji: "🌳", key: "tree.grow" },
  { min: 75, emoji: "🌲", key: "tree.strong" },
  { min: 100, emoji: "🌲🌳🌲", key: "tree.forest" },
];

/** Growth tree — CSS animation replaces Framer Motion for stage transitions and bar fill. */
export function TreeView({ current, total, color }: TreeViewProps) {
  const { t } = useT();
  const p = percent(current, total);
  const stage = [...STAGES].reverse().find((s) => p >= s.min) ?? STAGES[0];
  const next = STAGES.find((s) => s.min > p);

  // Render width=0 first, then transition to p% — mimics Framer Motion initial/animate.
  const [width, setWidth] = useState(0);
  useEffect(() => { setWidth(p); }, [p]);

  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div
        key={stage.key}
        className="text-6xl"
        style={{ animation: "fade-up 0.4s both" }}
      >
        {stage.emoji}
      </div>
      <div className="text-lg font-semibold text-text-primary">{t(stage.key)}</div>
      <div className="text-3xl font-bold" style={{ color }}>
        {p}%
      </div>
      <div className="h-2 w-48 overflow-hidden rounded-full bg-border/50">
        <div
          className="h-full rounded-full"
          style={{ backgroundColor: color, width: `${width}%`, transition: "width 0.6s ease-out" }}
        />
      </div>
      <div className="text-xs text-text-secondary">
        {next ? t("tree.next", { n: next.min - p, label: t(next.key) }) : t("tree.done")}
      </div>
    </div>
  );
}
