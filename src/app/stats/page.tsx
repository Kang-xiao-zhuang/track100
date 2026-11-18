"use client";

import { useMemo, useState } from "react";
import { Award, Flame, Target } from "lucide-react";
import { useGoalStore } from "@/store/goal.store";
import { byCategory, dailyCounts, overview, streak } from "@/utils/stats";
import { achievements } from "@/utils/achievements";
import { topGoalsByCheckins } from "@/utils/insights";
import { cellsLit } from "@/utils/progress";
import { cn } from "@/lib/cn";
import { useAccentColors } from "@/lib/use-accent";
import { useT } from "@/lib/i18n";
import { StatsSkeleton } from "@/components/common/skeleton";
import { CellGrid } from "@/components/common/cell-grid";
import { ProgressRing } from "@/components/progress/progress-ring";
import { ActivityChart } from "@/components/progress/activity-chart";
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

export default function StatsPage() {
  const hydrated = useGoalStore((s) => s.hydrated);
  const goals = useGoalStore((s) => s.goals);
  const history = useGoalStore((s) => s.history);

  const { t } = useT();
  // SVG 属性(图表 stroke / 渐变 stop-color / 进度环)在 Android WebView 里不认 CSS 变量,用真实色值。
  const accent = useAccentColors();
  const ov = useMemo(() => overview(goals, history), [goals, history]);
  const st = useMemo(() => streak(history), [history]);
  const cats = useMemo(
    () => byCategory(goals).map((c) => ({ ...c, label: t("cat." + c.category), color: CATEGORY_COLORS[c.category] ?? "#6E7F4F" })),
    [goals, t],
  );
  const daily = useMemo(() => dailyCounts(history, 30), [history]);
  const total30 = useMemo(() => daily.reduce((s, d) => s + d.count, 0), [daily]);
  const peak30 = useMemo(() => daily.reduce((m, d) => Math.max(m, d.count), 0), [daily]);
  const topGoals = useMemo(() => topGoalsByCheckins(goals, history, 3), [goals, history]);
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
    <main className="mx-auto min-h-[calc(100dvh-6rem)] max-w-app px-5 pb-6 pt-6">
      {/* header */}
      <header className="flex shrink-0 items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/80">{t("stats.eyebrow")}</p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-text-primary">{t("stats.title")}</h1>
        </div>
        <button
          onClick={() => setBadgeIndex(0)}
          aria-label={t("stats.achievements")}
          className="text-right transition-opacity active:opacity-70"
        >
          <div className="text-xl font-semibold tracking-tight text-text-primary">
            {unlocked}<span className="text-xs font-normal text-text-secondary">/{badges.length}</span>
          </div>
          <div className="mt-0.5 text-[10px] tracking-wide text-text-secondary">{t("stats.achievements")}</div>
        </button>
      </header>

      {/* 通透 Hero */}
      <section className="mt-4 rounded-card border border-border/70 bg-surface p-4">
        <div className="flex items-center gap-4">
          <ProgressRing value={ov.completionRate / 100} size={86} stroke={7} color={accent.css}>
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
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        <MiniStat icon={<Flame size={16} />} label={t("stats.streak")} value={st} unit={t("unit.days")} accent />
        <MiniStat icon={<Target size={16} />} label={t("stats.totalGoals")} value={ov.totalGoals} />
        <MiniStat icon={<Award size={16} />} label={t("stats.completed")} value={ov.completedGoals} />
      </div>

      {/* 近 30 天活跃 —— 给足高度,别挤成一条线 */}
      <section className="mt-3.5 rounded-card border border-border/70 bg-surface px-4 pb-3 pt-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-text-primary">{t("stats.last30")}</h2>
            <p className="mt-0.5 text-[10px] text-text-secondary">{t("stats.last30Sub")}</p>
          </div>
          <div className="text-right">
            <div className="text-base font-semibold leading-none tabular-nums" style={{ color: accent.css }}>
              {Math.round((total30 / 30) * 10) / 10}
            </div>
            <div className="mt-1 text-[10px] text-text-secondary">{t("stats.dailyAvg")}</div>
          </div>
        </div>
        <div className="mt-2.5">
          <ActivityChart
            data={daily}
            unit={t("u.times")}
            emptyText={t("stats.chartEmpty")}
            emptySub={t("stats.chartEmptySub")}
          />
        </div>
        {total30 > 0 && (
          <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2.5 text-[10px] text-text-secondary">
            <span>{t("stats.last30Total", { n: total30 })}</span>
            <span>{t("stats.last30Peak", { n: peak30 })}</span>
          </div>
        )}
      </section>

      {/* 最活跃目标排行 */}
      {topGoals.length > 0 && (
        <section className="mt-3 rounded-card border border-border/70 bg-surface px-4 py-3">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-text-primary">{t("stats.topGoals")}</h2>
            <span className="text-[10px] text-text-secondary">{t("stats.topGoalSub")}</span>
          </div>
          <div className="flex flex-col gap-2">
            {topGoals.map((tg, i) => (
              <div key={tg.goal.id} className="flex items-center gap-2">
                <span className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                  i === 0 ? "bg-primary text-white" : "bg-border/60 text-text-secondary",
                )}>
                  {i + 1}
                </span>
                <span className="text-sm leading-none">{tg.goal.icon}</span>
                <span className="min-w-0 flex-1 truncate text-[11px] text-text-primary">{tg.goal.title}</span>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums" style={{ color: tg.goal.color }}>
                  {t("stats.checkinsUnit", { n: tg.count })}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 分类分布 */}
      {cats.length > 0 && (
        <section className="mt-3 rounded-card border border-border/70 bg-surface px-4 py-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-text-primary">{t("stats.catDist")}</h2>
            <span className="text-[10px] text-text-secondary">{t("stats.goalCount", { n: catTotal })}</span>
          </div>
          <div className="mt-2.5 flex h-2 gap-1 overflow-hidden rounded-full">
            {cats.map((c) => (
              <div
                key={c.category}
                className="h-full rounded-full"
                style={{ width: `${(c.count / catTotal) * 100}%`, backgroundColor: c.color }}
                title={`${c.label} ${c.count}`}
              />
            ))}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
            {cats.map((c) => (
              <span key={c.category} className="flex items-center gap-1.5 text-[11px]">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="text-text-secondary">{c.label}</span>
                <span className="font-semibold tabular-nums text-text-primary">{c.count}</span>
              </span>
            ))}
          </div>
        </section>
      )}

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
