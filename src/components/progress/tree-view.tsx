"use client";

import { motion } from "framer-motion";
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

export function TreeView({ current, total, color }: TreeViewProps) {
  const { t } = useT();
  const p = percent(current, total);
  const stage = [...STAGES].reverse().find((s) => p >= s.min) ?? STAGES[0];
  const next = STAGES.find((s) => s.min > p);

  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <motion.div
        key={stage.key}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 16 }}
        className="text-6xl"
      >
        {stage.emoji}
      </motion.div>
      <div className="text-lg font-semibold text-text-primary">{t(stage.key)}</div>
      <div className="text-3xl font-bold" style={{ color }}>
        {p}%
      </div>
      <div className="h-2 w-48 overflow-hidden rounded-full bg-border/50">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${p}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <div className="text-xs text-text-secondary">
        {next ? t("tree.next", { n: next.min - p, label: t(next.key) }) : t("tree.done")}
      </div>
    </div>
  );
}
