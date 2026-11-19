"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";

type HeatCell = { key: string; count: number };

/** 全年打卡热力图:按周成列、每列 7 天,颜色深浅代表当天次数。纯 div,不依赖 canvas。 */
export function ActivityHeatmap({
  heat,
  css,
  grid,
  legendLess,
  legendMore,
  empty,
}: {
  heat: HeatCell[];
  css: string;
  grid: string;
  legendLess: string;
  legendMore: string;
  empty?: string;
}) {
  const { weeks, months } = useMemo(() => {
    if (heat.length === 0) return { weeks: [] as (HeatCell | null)[][], months: [] as { label: number; col: number }[] };
    // 补齐到完整周:第一行从周日开始,最后一行补到周六
    const first = new Date(`${heat[0].key}T12:00:00`);
    const lead = first.getDay();
    const padded: (HeatCell | null)[] = [...Array.from({ length: lead }, () => null), ...heat];
    while (padded.length % 7 !== 0) padded.push(null);
    const cols: (HeatCell | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) cols.push(padded.slice(i, i + 7));

    const labels: { label: number; col: number }[] = [];
    cols.forEach((col, ci) => {
      const firstReal = col.find((c) => c !== null) as HeatCell | null;
      if (!firstReal) return;
      const m = Number(firstReal.key.slice(5, 7));
      const prev = labels[labels.length - 1];
      if (!prev || prev.label !== m) labels.push({ label: m, col: ci });
    });
    return { weeks: cols, months: labels };
  }, [heat]);

  const level = (n: number) => (n <= 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : 3);
  const total = heat.reduce((s, c) => s + c.count, 0);

  if (total === 0) {
    return <p className="py-6 text-center text-xs text-text-secondary">{empty}</p>;
  }

  return (
    <div>
      <div className="no-scrollbar overflow-x-auto pb-1">
        <div className="inline-flex min-w-full flex-col gap-1">
          {/* 月份标签 */}
          <div className="relative h-3">
            {months.map((m) => (
              <span
                key={`${m.label}-${m.col}`}
                className="absolute top-0 text-[9px] text-text-secondary"
                style={{ left: m.col * 12 }}
              >
                {m.label}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {weeks.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-[3px]">
                {col.map((cell, ri) => (
                  <div
                    key={ri}
                    title={cell ? `${cell.key} · ${cell.count}` : undefined}
                    className={cn("h-[9px] w-[9px] rounded-[2px]")}
                    style={{
                      backgroundColor: !cell || cell.count === 0 ? grid : css,
                      opacity: cell && cell.count > 0 ? [0, 0.4, 0.7, 1][level(cell.count)] : 1,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5 text-[9px] text-text-secondary">
        <span>{legendLess}</span>
        {[0, 0.4, 0.7, 1].map((o, i) => (
          <span
            key={i}
            className={cn("h-[9px] w-[9px] rounded-[2px]")}
            style={{ backgroundColor: i === 0 ? grid : css, opacity: i === 0 ? 1 : o }}
          />
        ))}
        <span>{legendMore}</span>
      </div>
    </div>
  );
}
