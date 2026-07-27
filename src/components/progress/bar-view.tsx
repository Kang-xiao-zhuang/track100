"use client";

import { useState, useEffect } from "react";
import { percent } from "@/utils/progress";

interface BarViewProps {
  current: number;
  total: number;
  color: string;
}

/** Progress bar — CSS transition replaces Framer Motion for GPU-composited width animation. */
export function BarView({ current, total, color }: BarViewProps) {
  const p = percent(current, total);
  // Render width=0 first, then transition to p% — mimics Framer Motion initial/animate.
  const [width, setWidth] = useState(0);
  useEffect(() => { setWidth(p); }, [p]);

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="text-4xl font-bold" style={{ color }}>
        {p}%
      </div>
      <div className="h-5 w-full overflow-hidden rounded-full bg-border/50">
        <div
          className="h-full rounded-full"
          style={{ backgroundColor: color, width: `${width}%`, transition: "width 0.6s ease-out" }}
        />
      </div>
    </div>
  );
}
