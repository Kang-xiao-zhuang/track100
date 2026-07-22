"use client";

import { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useGoalStore } from "@/store/goal.store";
import { byCategory, dailyCounts, overview, streak } from "@/utils/stats";
import { achievements } from "@/utils/achievements";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";

export default function StatsPage() {
  const hydrated = useGoalStore((s) => s.hydrated);
  const goals = useGoalStore((s) => s.goals);
  const history = useGoalStore((s) => s.history);

  const { t } = useT();
  const ov = useMemo(() => overview(goals, history), [goals, history]);
  const st = useMemo(() => streak(history), [history]);
  const cats = useMemo(() => byCategory(goals).map((c) => ({ name: t("cat." + c.category), count: c.count })), [goals, t]);
  const daily = useMemo(() => dailyCounts(history, 30), [history]);
  const badges = useMemo(() => achievements(goals, history), [goals, history]);

  if (!hydrated) return <div className="p-6 text-text-secondary">{t("loading")}</div>;

  return (
    <main className="px-5 pt-6">
      <h1 className="text-xl font-bold">{t("stats.title")}</h1>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatCard label={t("stats.totalGoals")} value={ov.totalGoals} />
        <StatCard label={t("stats.completed")} value={ov.completedGoals} />
        <StatCard label={t("stats.streak")} value={`${st} ${t("unit.days")}`} />
        <StatCard label={t("stats.records")} value={ov.totalRecords} />
      </div>

      <StatCard className="mt-3" label={t("stats.rate")} value={`${ov.completionRate}%`} big />

      {cats.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-text-secondary">{t("stats.catDist")}</h2>
          <div className="rounded-card border border-border bg-surface p-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={cats}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "rgb(var(--text-secondary))" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "rgb(var(--border) / 0.3)" }} contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="rgb(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-text-secondary">{t("stats.last30")}</h2>
        <div className="rounded-card border border-border bg-surface p-4">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={daily}>
              <Tooltip cursor={{ fill: "rgb(var(--border) / 0.3)" }} contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="rgb(var(--primary))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-6 pb-4">
        <h2 className="mb-2 text-sm font-semibold text-text-secondary">{t("stats.achievements")}</h2>
        <div className="grid grid-cols-2 gap-3">
          {badges.map((b) => (
            <div
              key={b.id}
              className={cn(
                "flex items-center gap-3 rounded-card border p-3.5",
                b.unlocked ? "border-primary/40 bg-primary/5" : "border-border bg-surface opacity-60",
              )}
            >
              <span className={cn("text-3xl", !b.unlocked && "grayscale")}>{b.icon}</span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-text-primary">{t(`b.${b.id}.t`)}</div>
                <div className="truncate text-xs text-text-secondary">{t(`b.${b.id}.d`)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

const tooltipStyle = {
  background: "rgb(var(--surface))",
  border: "1px solid rgb(var(--border))",
  borderRadius: 12,
  fontSize: 12,
  color: "rgb(var(--text-primary))",
} as const;

function StatCard({ label, value, big, className }: { label: string; value: string | number; big?: boolean; className?: string }) {
  return (
    <div className={`rounded-card border border-border bg-surface p-4 ${className ?? ""}`}>
      <div className="text-sm text-text-secondary">{label}</div>
      <div className={big ? "mt-1 text-3xl font-bold text-primary" : "mt-1 text-2xl font-bold text-text-primary"}>{value}</div>
    </div>
  );
}
