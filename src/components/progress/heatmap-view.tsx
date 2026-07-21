"use client";

import type { ProgressRecord } from "@/types/goal";

interface HeatmapViewProps {
  records: ProgressRecord[];
  color: string;
  days?: number;
}

/** GitHub-style contribution grid built from this goal's check-in history. */
export function HeatmapView({ records, color, days = 91 }: HeatmapViewProps) {
  // count check-ins per day
  const counts = new Map<string, number>();
  for (const r of records) {
    if (r.value <= 0) continue;
    const key = r.createdAt.slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const today = new Date();
  const cells: { key: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ key, count: counts.get(key) ?? 0 });
  }

  const opacityFor = (c: number) => (c <= 0 ? 0 : c === 1 ? 0.4 : c === 2 ? 0.7 : 1);

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="grid grid-flow-col grid-rows-7 gap-1">
        {cells.map((c) => (
          <div
            key={c.key}
            title={`${c.key.slice(5)} · ${c.count} 次`}
            className="h-3.5 w-3.5 rounded-[3px]"
            style={{
              backgroundColor: c.count > 0 ? color : "rgb(var(--border) / 0.5)",
              opacity: c.count > 0 ? opacityFor(c.count) : 1,
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
        <span>少</span>
        {[0.4, 0.7, 1].map((o) => (
          <span key={o} className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: color, opacity: o }} />
        ))}
        <span>多</span>
      </div>
      <div className="text-xs text-text-secondary">最近 {days} 天</div>
    </div>
  );
}
