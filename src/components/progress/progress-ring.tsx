"use client";

import { useState, useEffect } from "react";

interface ProgressRingProps {
  /** 0..1 */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
}

/** Reusable circular progress — CSS transition replaces Framer Motion for GPU-composited animation.
 *  Used on Home cards, Goal detail, and Stats. */
export function ProgressRing({ value, size = 72, stroke = 8, color = "rgb(var(--primary))", children }: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(1, Math.max(0, value));
  const finalOffset = c * (1 - v);

  // Render empty ring first, then transition to progress (mimics Framer Motion initial/animate).
  const [offset, setOffset] = useState(c);
  useEffect(() => { setOffset(finalOffset); }, [finalOffset]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--border))"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease-out", animation: "ring-initial 0.3s both" }}
        />
      </svg>
      {children != null && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}
