"use client";

import { motion } from "framer-motion";
import { percent } from "@/utils/progress";

interface TreeViewProps {
  current: number;
  total: number;
  color: string;
}

// Growth stages by completion — the goal literally grows as you progress.
const STAGES = [
  { min: 0, emoji: "🌱", label: "幼苗" },
  { min: 20, emoji: "🌿", label: "抽芽" },
  { min: 45, emoji: "🌳", label: "成长" },
  { min: 75, emoji: "🌲", label: "茁壮" },
  { min: 100, emoji: "🌲🌳🌲", label: "成林" },
];

export function TreeView({ current, total, color }: TreeViewProps) {
  const p = percent(current, total);
  const stage = [...STAGES].reverse().find((s) => p >= s.min) ?? STAGES[0];
  const next = STAGES.find((s) => s.min > p);

  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <motion.div
        key={stage.label}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 16 }}
        className="text-6xl"
      >
        {stage.emoji}
      </motion.div>
      <div className="text-lg font-semibold text-text-primary">{stage.label}</div>
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
        {next ? `再 ${next.min - p}% 长成「${next.label}」` : "已长成森林 🎉"}
      </div>
    </div>
  );
}
