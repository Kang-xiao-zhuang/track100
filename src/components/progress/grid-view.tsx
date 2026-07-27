"use client";

import { cellsLit } from "@/utils/progress";

interface GridViewProps {
  current: number;
  total: number;
  color: string;
}

/** 100 cells, each = 1% of the target. Lit count follows progress.
 *  Uses CSS animation instead of Framer Motion — GPU-composited, zero JS overhead per cell. */
export function GridView({ current, total, color }: GridViewProps) {
  const lit = cellsLit(current, total);
  return (
    <div className="grid grid-cols-10 gap-1">
      {Array.from({ length: 100 }, (_, i) => {
        const on = i < lit;
        return (
          <div
            key={i}
            className="aspect-square rounded-[6px] transition-colors duration-300"
            style={{
              backgroundColor: on ? color : "rgb(var(--border) / 0.5)",
              animation: `cell-appear 0.25s ${Math.min(i, 40) * 6}ms both`,
            }}
          />
        );
      })}
    </div>
  );
}
