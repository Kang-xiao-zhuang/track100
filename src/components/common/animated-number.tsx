"use client";

import { useEffect, useRef, useState } from "react";

/** 数字滚动:打卡后累计格子数从旧值平滑过渡到新值,而不是直接跳变。 */
export function AnimatedNumber({
  value,
  className,
  duration = 520,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);

  useEffect(() => {
    const from = displayRef.current;
    if (from === value) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = Math.round(from + (value - from) * eased);
      displayRef.current = next;
      setDisplay(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={className}>{display}</span>;
}
