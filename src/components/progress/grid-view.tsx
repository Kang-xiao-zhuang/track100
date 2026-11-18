"use client";

import { cellsLit } from "@/utils/progress";

interface GridViewProps {
  current: number;
  total: number;
  color: string;
}

/** 100 cells, each = 1% of the target. Lit count follows progress.
 *  入场用整块淡入,不再逐格缩放:100 个格子各自缩放会让整片网格看起来在抖。 */
export function GridView({ current, total, color }: GridViewProps) {
  const lit = cellsLit(current, total);
  return (
    <div className="grid grid-cols-10 gap-1" style={{ animation: "fade-in 0.22s ease-out both" }}>
      {Array.from({ length: 100 }, (_, i) => {
        const on = i < lit;
        return (
          <div
            key={i}
            className="aspect-square rounded-[6px] transition-colors duration-300"
            style={{ backgroundColor: on ? color : "rgb(var(--border) / 0.5)" }}
          />
        );
      })}
    </div>
  );
}
