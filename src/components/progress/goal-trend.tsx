"use client";

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Goal, ProgressRecord } from "@/types/goal";
import { useT } from "@/lib/i18n";
import { HeatmapView } from "./heatmap-view";
import { goalTrend, shortDay } from "@/utils/trend";

const tooltipStyle = {
  background: "rgb(var(--surface))",
  border: "1px solid rgb(var(--border))",
  borderRadius: 12,
  fontSize: 12,
  color: "rgb(var(--text-primary))",
} as const;

/** 单目标趋势:累计完成曲线 + 打卡热力图,数据全部来自该目标自己的记录。 */
export function GoalTrend({ goal, records }: { goal: Goal; records: ProgressRecord[] }) {
  const { t } = useT();
  const points = useMemo(() => goalTrend(records, goal.target), [records, goal.target]);
  const data = useMemo(() => points.map((p) => ({ name: shortDay(p.date), pct: p.pct })), [points]);
  const hasData = points.length > 0;

  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-semibold text-text-secondary">{t("trend.title")}</h2>
      <div className="rounded-card border border-border bg-surface p-4">
        {hasData ? (
          <>
            <div className="text-xs text-text-secondary">{t("trend.curve")}</div>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={data} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={goal.color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={goal.color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "rgb(var(--text-secondary))" }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "rgb(var(--text-secondary))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip cursor={{ stroke: "rgb(var(--border))" }} contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, t("trend.progress")]} />
                <Area type="monotone" dataKey="pct" stroke={goal.color} strokeWidth={2} fill="url(#trendFill)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-2 border-t border-border/60 pt-1">
              <HeatmapView records={records} color={goal.color} />
            </div>
          </>
        ) : (
          <p className="py-6 text-center text-sm text-text-secondary">{t("trend.empty")}</p>
        )}
      </div>
    </section>
  );
}
