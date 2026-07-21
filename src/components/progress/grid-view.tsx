"use client";

import { motion } from "framer-motion";
import { cellsLit } from "@/utils/progress";

interface GridViewProps {
  current: number;
  total: number;
  color: string;
}

/** 100 cells, each = 1% of the target. Lit count follows progress. */
export function GridView({ current, total, color }: GridViewProps) {
  const lit = cellsLit(current, total);
  return (
    <div className="grid grid-cols-10 gap-1">
      {Array.from({ length: 100 }, (_, i) => {
        const on = i < lit;
        return (
          <motion.div
            key={i}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25, delay: Math.min(i, 40) * 0.006 }}
            className="aspect-square rounded-[6px]"
            style={{
              backgroundColor: on ? color : "rgb(var(--border) / 0.5)",
            }}
          />
        );
      })}
    </div>
  );
}
