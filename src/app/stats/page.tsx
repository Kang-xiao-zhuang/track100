"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Award, Flame, Target } from "lucide-react";
import { useGoalStore } from "@/store/goal.store";
import { byCategory, dailyCounts, overview, streak } from "@/utils/stats";
import { achievements } from "@/utils/achievements";
import { cellsLit } from "@/utils/progress";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import { StatsSkeleton } from "@/components/common/skeleton";
import { CellGrid } from "@/components/common/cell-grid";
import { ProgressRing } from "@/components/progress/progress-ring";
import { AchievementSheet } from "@/components/common/achievement-sheet";

const CATEGORY_COLORS: Record<string, string> = {
  learning: "#6E7F4F",
  health: "#B0725A",
  fitness: "#C08A4E",
  work: "#5E7C8C",
  life: "#7C8C6A",
  finance: "#A68B4E",
  other: "#8A7E8F",
};

const tooltipStyle = {
  background: "rgb(var(--surface))",
  border: "1px solid rgb(var(--border))",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  color: "rgb(var(--text-primary))",
} as const;

export default function StatsPage() {
  const hydrated = useGoalStore((s) => s.hydrated);
  const goals = useGoalStore((s) => s.goals);
  const history = useGoalStore((s) => s.history);

  const { t } = useT();
  const ov = useMemo(() => overview(goals, history), [goals, history]);
  const st = useMemo(() => streak(history), [history]);
  const cats = useMemo(
    () => byCategory(goals).map((c) => ({ ...c, label: t("cat." + c.category), color: CATEGORY_COLORS[c.category] ?? "#6E7F4F" })),
    [goals, t],
  );
  const daily = useMemo(() => dailyCounts(history, 30), [history]);
  const badges = useMemo(() => achievements(goals, history), [goals, history]);
  const totalCells = useMemo(
    () => goals.filter((g) => !g.archived && !g.deletedAt).reduce((sum, g) => sum + cellsLit(g.current, g.target), 0),
    [goals],
  );
  const unlocked = badges.filter((b) => b.unlocked).length;
  const catTotal = cats.reduce((s, c) => s + c.count, 0) || 1;
  const [badgeIndex, setBadgeIndex] = useState<number | null>(null);

  if (!hydrated) return <StatsSkeleton />;

  return (
    <main className="mx-auto flex h-[calc(100dvh-6rem)] max-w-app flex-col overflow-hidden px-5 pb-2 pt-6">
      {/* header */}
      <header className="flex shrink-0 items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/80">{t("stats.eyebrow")}</p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-text-primary">{t("stats.title")}</h1>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold tracking-tight text-text-primary">
            {unlocked}<span className="text-xs font-normal text-text-secondary">/{badges.length}</span>
          </div>
          <div className="mt-0.5 text-[10px] tracking-wide text-text-secondary">{t("stats.achievements")}</div>
        </div>
      </header>

      {/* 通透 Hero */}
      <section className="mt-4 shrink-0 rounded-card border border-border/70 bg-surface p-4">
        <div className="flex items-center gap-4">
          <ProgressRing value={ov.completionRate / 100} size={86} stroke={7} color="rgb(var(--primary))">
            <div className="text-center">
              <div className="text-xl font-semibold tracking-tight text-text-primary">{ov.completionRate}%</div>
              <div className="mt-0.5 text-[8px] uppercase tracking-widest text-text-secondary">{t("stats.rate")}</div>
            </div>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] tracking-wide text-text-secondary">{t("stats.totalCells")}</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[40px] font-semibold leading-none tracking-tight text-text-primary tabular-nums">{totalCells}</span>
              <span className="text-sm text-text-secondary">{t("review.cells")}</span>
            </div>
            <p className="mt-1 text-[11px] text-text-secondary">
              {t("stats.heroSub", { done: ov.completedGoals, total: ov.totalGoals })}
            </p>
          </div>
        </div>
        <div className="mt-3.5 border-t border-border/60 pt-3">
          <CellGrid lit={ov.completionRate} cols={25} gap="gap-1" />
        </div>
      </section>

      {/* 数据行 */}
      <div className="mt-2.5 grid shrink-0 grid-cols-3 gap-2">
        <MiniStat icon={<Flame size={16} />} label={t("stats.streak")} value={st} unit={t("unit.days")} accent />
        <MiniStat icon={<Target size={16} />} label={t("stats.totalGoals")} value={ov.totalGoals} />
        <MiniStat icon={<Award size={16} />} label={t("stats.completed")} value={ov.completedGoals} />
      </div>

      {/* 活跃曲线 —— 吃掉剩余空间 */}
      <section className="mt-4 flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex shrink-0 items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-text-primary">{t("stats.last30")}</h2>
          <span className="text-[11px] text-text-secondary">{t("stats.last30Sub")}</span>
        </div>
        <div className="min-h-[80px] flex-1 rounded-card border border-border/70 bg-surface px-2 py-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
              <defs>
                <linearGradient id="statsArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(var(--primary))" stopOpacity={0.24} />
                  <stop offset="100%" stopColor="rgb(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "rgb(var(--text-secondary))" }} axisLine={false} tickLine={false} minTickGap={28} />
              <Tooltip cursor={{ stroke: "rgb(var(--border))", strokeDasharray: "3 3" }} contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="count" stroke="rgb(var(--primary))" strokeWidth={2} fill="url(#statsArea)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 分类色带 + 成就图标行 */}
      <div className="mt-3 shrink-0 space-y-2.5">
        {cats.length > 0 && (
          <div>
            <div className="mb-1 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
              {cats.map((c) => (
                <div key={c.category} style={{ width: `${(c.count / catTotal) * 100}%`, backgroundColor: c.color }} title={`${c.label} ${c.count}`} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              {cats.map((c) => (
                <span key={c.category} className="flex items-center gap-1 text-[10px] text-text-secondary">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.label} {c.count}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border/50 pt-2.5">
          {badges.map((b, i) => (
            <button
              key={b.id}
              onClick={() => setBadgeIndex(i)}
              aria-label={t(`b.${b.id}.t`)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl text-xl leading-none transition-colors active:bg-border/60",
                !b.unlocked && "grayscale opacity-30",
              )}
            >
              {b.icon}
            </button>
          ))}
        </div>
      </div>

      <AchievementSheet
        badges={badges}
        index={badgeIndex}
        onClose={() => setBadgeIndex(null)}
        onChange={setBadgeIndex}
      />
    </main>
  );
}

function MiniStat({
  icon,
  label,
  value,
  unit,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface p-3">
      <div className={cn("mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg", accent ? "bg-warning/12 text-warning" : "bg-primary/10 text-primary")}>
        {icon}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-semibold tabular-nums leading-none tracking-tight text-text-primary">{value}</span>
        {unit && <span className="text-[10px] text-text-secondary">{unit}</span>}
      </div>
      <div className="mt-1 truncate text-[10px] text-text-secondary">{label}</div>
    </div>
  );
}
