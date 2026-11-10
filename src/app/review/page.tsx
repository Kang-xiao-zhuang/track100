"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { useGoalStore } from "@/store/goal.store";
import { useT } from "@/lib/i18n";
import { availableYears, buildReview } from "@/utils/review";
import { drawReviewCard } from "@/lib/review-card";
import { saveFile } from "@/lib/native";
import { cn } from "@/lib/cn";

const tooltipStyle = {
  background: "rgb(var(--surface))",
  border: "1px solid rgb(var(--border))",
  borderRadius: 12,
  fontSize: 12,
  color: "rgb(var(--text-primary))",
} as const;

export default function ReviewPage() {
  const hydrated = useGoalStore((s) => s.hydrated);
  const goals = useGoalStore((s) => s.goals);
  const history = useGoalStore((s) => s.history);
  const { t, lang } = useT();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [sharing, setSharing] = useState(false);

  const years = useMemo(() => availableYears(goals, history), [goals, history]);
  const r = useMemo(() => buildReview(goals, history, year), [goals, history, year]);
  const monthly = useMemo(
    () => r.monthly.map((m) => ({ name: String(m.month), count: m.count })),
    [r.monthly],
  );
  const idx = years.indexOf(year);
  const prevYear = idx >= 0 && idx < years.length - 1 ? years[idx + 1] : null;
  const nextYear = idx > 0 ? years[idx - 1] : null;
  const empty = r.checkIns === 0 && r.completed.length === 0;

  const onShare = async () => {
    if (sharing) return; // 连点会撞上 Share 插件的 isPresenting 锁
    setSharing(true);
    try {
      const blob = await drawReviewCard(r, lang);
      await saveFile(blob, `track100-review-${r.year}.png`, {
        title: t("review.cardTitle", { year: r.year }),
        dialogTitle: t("share.dialogTitle"),
      });
      // 用户取消分享由 saveFile 静默处理,不会走到 catch
    } catch {
      window.alert(t("share.failed"));
    } finally {
      setSharing(false);
    }
  };

  if (!hydrated) return <div className="p-6 text-text-secondary">{t("loading")}</div>;

  return (
    <main className="px-5 pb-6 pt-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("review.title")}</h1>
        <button
          onClick={onShare}
          disabled={sharing}
          aria-label={sharing ? t("share.generating") : t("review.share")}
          className="flex h-9 w-9 items-center justify-center rounded-full text-text-primary hover:bg-border/50 disabled:opacity-40"
        >
          <Share2 size={18} className={sharing ? "animate-pulse" : ""} />
        </button>
      </header>

      {/* Year switcher */}
      <div className="mt-4 flex items-center justify-center gap-6">
        <button
          onClick={() => prevYear && setYear(prevYear)}
          disabled={prevYear === null}
          aria-label={t("review.prevYear")}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-text-secondary disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="min-w-24 text-center text-2xl font-bold text-primary">{year}</span>
        <button
          onClick={() => nextYear && setYear(nextYear)}
          disabled={nextYear === null}
          aria-label={t("review.nextYear")}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-text-secondary disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Hero */}
      <section
        className="mt-4 rounded-card p-6 text-white shadow-card"
        style={{ background: "linear-gradient(135deg, #556B2F 0%, #2C3A18 100%)" }}
      >
        <p className="text-sm opacity-80">{t("review.subtitle")}</p>
        <div className="mt-1 text-6xl font-extrabold leading-tight">{r.litCells}</div>
        <p className="text-lg font-semibold opacity-90">{t("review.cells")}</p>
        <p className="mt-4 text-xs opacity-70">{t("review.footer")}</p>
      </section>

      {empty ? (
        <div className="mt-10 flex flex-col items-center text-center">
          <div className="text-5xl">🌱</div>
          <h2 className="mt-4 text-base font-semibold">{t("review.empty")}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t("review.emptySub")}</p>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatCard label={t("review.checkIns")} value={r.checkIns} />
            <StatCard label={t("review.activeDays")} value={r.activeDays} />
            <StatCard label={t("review.longest")} value={`${r.longestStreak} ${t("unit.days")}`} />
            <StatCard label={t("review.completed")} value={r.completed.length} />
          </div>
          <p className="mt-2 text-center text-xs text-text-secondary">
            {t("review.activeGoals")} {r.activeGoals}
          </p>

          {/* Monthly */}
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-text-secondary">{t("review.monthly")}</h2>
            <div className="rounded-card border border-border bg-surface p-4">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={monthly}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "rgb(var(--text-secondary))" }} axisLine={false} tickLine={false} interval={0} />
                  <Tooltip cursor={{ fill: "rgb(var(--border) / 0.3)" }} contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="rgb(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {r.bestMonth !== null && (
                <p className="mt-1 text-center text-xs text-text-secondary">
                  {t("review.bestMonth", { month: r.bestMonth, n: r.monthly[r.bestMonth - 1].count })}
                </p>
              )}
            </div>
          </section>

          {/* Year heatmap */}
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-text-secondary">{t("review.heat")}</h2>
            <div className="no-scrollbar overflow-x-auto rounded-card border border-border bg-surface p-4">
              <div className="grid w-max grid-flow-col grid-rows-7 gap-[3px]">
                {r.heat.map((d) => (
                  <div
                    key={d.key}
                    title={`${d.key} · ${d.count}`}
                    className="h-3 w-3 rounded-[2px]"
                    style={{
                      backgroundColor: d.count > 0 ? "rgb(var(--primary))" : "rgb(var(--border) / 0.5)",
                      opacity: d.count > 0 ? Math.min(1, 0.4 + d.count * 0.2) : 1,
                    }}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Focus + top goals */}
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-text-secondary">{t("review.topCategory")}</h2>
            <div className="rounded-card border border-border bg-surface px-4 py-3 text-sm">
              {r.topCategory
                ? t("review.topCategoryValue", { name: t("cat." + r.topCategory.category), n: r.topCategory.count })
                : t("review.none")}
            </div>
          </section>

          {r.goalRanks.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-sm font-semibold text-text-secondary">{t("review.goalRank")}</h2>
              <div className="flex flex-col gap-2">
                {r.goalRanks.slice(0, 5).map(({ goal, checkIns, cells }) => (
                  <div key={goal.id} className="rounded-card border border-border bg-surface px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span>{goal.icon}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{goal.title}</span>
                      <span className="shrink-0 text-xs text-text-secondary">{checkIns} {t("u.times")}</span>
                      <span className="shrink-0 text-sm font-bold" style={{ color: goal.color }}>
                        {Math.round(cells)} {t("review.cells")}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/50">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, (cells / Math.max(1, r.goalRanks[0].cells)) * 100)}%`, backgroundColor: goal.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {r.completed.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-sm font-semibold text-text-secondary">{t("review.completedWall")}</h2>
              <div className="flex flex-wrap gap-2">
                {r.completed.map((g) => (
                  <div key={g.id} className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm">
                    <span>{g.icon}</span>
                    <span className="max-w-40 truncate">{g.title}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <button
            onClick={onShare}
            disabled={sharing}
            className={cn(
              "mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-btn bg-primary font-semibold text-white shadow-card active:scale-95 disabled:opacity-60",
            )}
          >
            <Share2 size={18} className={sharing ? "animate-pulse" : ""} />
            {sharing ? t("share.generating") : t("review.share")}
          </button>
        </>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="text-sm text-text-secondary">{label}</div>
      <div className="mt-1 text-2xl font-bold text-text-primary">{value}</div>
    </div>
  );
}
