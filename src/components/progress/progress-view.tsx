"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { GrowthMode } from "@/types/goal";
import { percent, fmt } from "@/utils/progress";
import { ProgressRing } from "./progress-ring";
import { GridView } from "./grid-view";
import { BarView } from "./bar-view";

interface ProgressViewProps {
  current: number;
  total: number;
  color: string;
  mode: GrowthMode;
}

/**
 * Strategy renderer — one data source, many views (docs/12-DESIGN-PATTERNS.md).
 * Adding a mode later = add a case, never a new page. tree/heatmap land in v1.1.
 */
export function ProgressView({ current, total, color, mode }: ProgressViewProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mode}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {mode === "ring" ? (
          <div className="flex justify-center py-6">
            <ProgressRing value={total ? current / total : 0} size={200} stroke={16} color={color}>
              <div className="text-center">
                <div className="text-4xl font-bold" style={{ color }}>
                  {percent(current, total)}%
                </div>
                <div className="mt-1 text-sm text-text-secondary">
                  {fmt(current)} / {fmt(total)}
                </div>
              </div>
            </ProgressRing>
          </div>
        ) : mode === "bar" ? (
          <BarView current={current} total={total} color={color} />
        ) : (
          <GridView current={current} total={total} color={color} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
