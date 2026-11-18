"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * 「点亮 100 格」产品意象的浓缩呈现。
 * 默认 10×10；可用 cols 调成细长格子带作为仪表盘装饰。
 */
export function CellGrid({
  lit,
  className,
  cols = 10,
  cellColor = "rgb(var(--primary))",
  offColor = "rgb(var(--border) / 0.5)",
  gap = "gap-[3px]",
  radius = "rounded-[2px]",
  animate = true,
}: {
  lit: number;
  className?: string;
  cols?: number;
  cellColor?: string;
  offColor?: string;
  gap?: string;
  radius?: string;
  animate?: boolean;
}) {
  const on = Math.max(0, Math.min(100, Math.round(lit)));
  // 首帧 prevOn === on,所有格子走原来的入场动画;之后只有新点亮的格子 pop 一下
  const prevOn = useRef(on);
  const newlyLitFrom = on > prevOn.current ? prevOn.current : -1;
  useEffect(() => { prevOn.current = on; }, [on]);
  return (
    <div
      className={cn("grid", gap, className)}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      aria-hidden="true"
    >
      {Array.from({ length: 100 }, (_, i) => (
        <div
          key={i}
          className={cn("aspect-square transition-colors duration-500", radius)}
          style={{
            backgroundColor: i < on ? cellColor : offColor,
            animation:
              newlyLitFrom >= 0 && i >= newlyLitFrom && i < on
                ? "cell-pop 0.36s ease-out both"
                : animate
                  ? `cell-appear 0.25s ${Math.min(i, 60) * 4}ms both`
                  : undefined,
          }}
        />
      ))}
    </div>
  );
}
