"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAccentColors } from "@/lib/use-accent";

export interface ActivityPoint {
  date: string; // "MM-DD"
  count: number;
}

interface ActivityChartProps {
  data: ActivityPoint[];
  /** 悬停/圆点里的单位文案（例如「次」）。 */
  unit: string;
  /** 空数据时的提示。 */
  emptyText: string;
  emptySub: string;
  height?: number;
}

/**
 * 近 30 天活跃曲线。
 *
 * 颜色全部用真实 rgb 值而不是 CSS 变量：Recharts 把颜色写进 SVG 的
 * stroke / fill 属性，Android WebView 对属性里的 var() 支持不完整。
 */
export function ActivityChart({ data, unit, emptyText, emptySub, height = 168 }: ActivityChartProps) {
  const accent = useAccentColors();
  const total = data.reduce((s, d) => s + d.count, 0);
  const peak = data.reduce((m, d) => Math.max(m, d.count), 0);
  // 顶部留一点余量让曲线不顶到边框,但别留太多,否则整体看着很平。
  const domainMax = Math.max(3, peak + (peak <= 5 ? 1 : Math.ceil(peak * 0.15)));
  const midTick = Math.round(domainMax / 2) || 1;
  const lastIndex = data.length - 1;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 text-center" style={{ height }}>
        <div className="flex items-end gap-1 opacity-45">
          {[10, 16, 8, 20, 12].map((h, i) => (
            <span key={i} className="w-1.5 rounded-full bg-text-secondary" style={{ height: h }} />
          ))}
        </div>
        <p className="mt-2.5 text-[11px] font-medium text-text-primary">{emptyText}</p>
        <p className="mt-0.5 text-[10px] text-text-secondary">{emptySub}</p>
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent.css} stopOpacity={0.36} />
              <stop offset="60%" stopColor={accent.css} stopOpacity={0.13} />
              <stop offset="100%" stopColor={accent.css} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={accent.grid} strokeDasharray="2 5" strokeOpacity={0.75} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: accent.axis }}
            axisLine={false}
            tickLine={false}
            minTickGap={26}
            tickMargin={8}
            tickFormatter={(v: string) => v.replace("-", "/")}
          />
          <YAxis
            width={22}
            tick={{ fontSize: 9, fill: accent.axis }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            domain={[0, domainMax]}
            ticks={[0, midTick, domainMax]}
          />
          <Tooltip
            cursor={{ stroke: accent.grid, strokeDasharray: "3 3" }}
            content={<ChartTooltip unit={unit} />}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={accent.css}
            strokeWidth={2.4}
            strokeLinecap="round"
            fill="url(#activityFill)"
            dot={<LastDot lastIndex={lastIndex} color={accent.css} surface={accent.surface} />}
            activeDot={{ r: 4.5, fill: accent.css, stroke: accent.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** 只在最新一天画一个点,让曲线「有起点」。 */
function LastDot(props: { cx?: number; cy?: number; index?: number; value?: number; lastIndex: number; color: string; surface: string }) {
  const { cx, cy, index, value, lastIndex, color, surface } = props;
  if (index !== lastIndex || !value || cx == null || cy == null) return <g />;
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill={color} opacity={0.16} />
      <circle cx={cx} cy={cy} r={3.2} fill={color} stroke={surface} strokeWidth={1.8} />
    </g>
  );
}

/** 轻量 tooltip:只显示日期 + 次数,不弹一块大黑板。 */
function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string | number;
  unit: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-surface px-2.5 py-1.5 shadow-hover">
      <div className="text-[9px] tracking-wide text-text-secondary">{String(label ?? "").replace("-", "/")}</div>
      <div className="mt-0.5 text-[13px] font-semibold leading-none text-text-primary tabular-nums">
        {payload[0]?.value ?? 0}
        <span className="ml-0.5 text-[10px] font-normal text-text-secondary">{unit}</span>
      </div>
    </div>
  );
}
