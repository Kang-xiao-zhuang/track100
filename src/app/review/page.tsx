"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Award, CalendarCheck, ChevronLeft, ChevronRight, Flame, Share2, Sparkles, Target } from "lucide-react";
import { useGoalStore } from "@/store/goal.store";
import { useSettingsStore } from "@/store/settings.store";
import { useT } from "@/lib/i18n";
import { buildReview } from "@/utils/review";
import {
  buildPeriodReview,
  canGoNext,
  shiftPeriod,
  type PeriodBucket,
  type ReviewPeriod,
} from "@/utils/period-review";
import { periodSummary } from "@/utils/period-summary";
import { drawReviewCard } from "@/lib/review-card";
import { accentPalette } from "@/lib/accent";
import { useAccentColors } from "@/lib/use-accent";
import { SharePreview } from "@/components/common/share-preview";
import { cn } from "@/lib/cn";
import { ReviewSkeleton } from "@/components/common/skeleton";
import { CellGrid } from "@/components/common/cell-grid";
import { ActivityHeatmap } from "@/components/common/activity-heatmap";

const tooltipStyle = {
  background: "rgb(var(--surface))",
  border: "1px solid rgb(var(--border))",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  color: "rgb(var(--text-primary))",
} as const;

const PERIODS: ReviewPeriod[] = ["week", "month", "year"];

export default function ReviewPage() {
  const hydrated = useGoalStore((s) => s.hydrated);
  const goals = useGoalStore((s) => s.goals);
  const history = useGoalStore((s) => s.history);
  const { t, lang } = useT();
  const accentHue = useSettingsStore((s) => s.accentHue);
  const accentSat = useSettingsStore((s) => s.accentSat);
  const accentLight = useSettingsStore((s) => s.accentLight);
  // SVG 渐变 stop-color 在 Android WebView 里不认 CSS 变量,用真实色值。
  const accent = useAccentColors();
  const [period, setPeriod] = useState<ReviewPeriod>("year");
  const [anchor, setAnchor] = useState(() => new Date());
  const [sharing, setSharing] = useState(false);
  const [shareBlob, setShareBlob] = useState<Blob | null>(null);

  const review = useMemo(
    () => buildPeriodReview(goals, history, period, anchor),
    [goals, history, period, anchor],
  );
  const yearReview = useMemo(
    () => (period === "year" ? buildReview(goals, history, anchor.getFullYear()) : null),
    [goals, history, period, anchor],
  );
  const chartData = useMemo(
    () => review.buckets.map((b: PeriodBucket) => ({ name: b.label, count: b.count })),
    [review.buckets],
  );
  const empty = review.checkIns === 0 && review.completed.length === 0;
  // 每个周期生成属于自己的小结句；文案按周期切换，不再是清一色「这一年」。
  const summary = useMemo(() => periodSummary(review), [review]);
  const title =
    period === "week"
      ? t("review.weekLabel", { w: review.weekNo, y: review.anchorYear })
      : period === "month"
        ? t("review.monthLabel", { y: review.anchorYear, m: review.anchorMonth })
        : t("review.yearLabel", { y: review.anchorYear });

  const goPrev = () => setAnchor((a) => shiftPeriod(period, a, -1));
  const goNext = () => {
    if (canGoNext(period, anchor)) setAnchor((a) => shiftPeriod(period, a, 1));
  };

  const onShare = async () => {
    if (sharing || !yearReview) return;
    setSharing(true);
    try {
      const blob = await drawReviewCard(yearReview, lang, accentPalette(accentHue, accentSat, accentLight));
      setShareBlob(blob); // 生成后先预览
    } catch {
      window.alert(t("share.failed"));
    } finally {
      setSharing(false);
    }
  };

  if (!hydrated) return <ReviewSkeleton />;

  return (
    <main className="mx-auto min-h-[calc(100dvh-6rem)] max-w-app px-5 pb-2 pt-6">
      {/* header */}
      <header className="flex shrink-0 items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/80">{t(`review.eyebrow.${period}`)}</p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-text-primary">{t(`review.title.${period}`)}</h1>
        </div>
        {period === "year" && (
          <button
            onClick={onShare}
            disabled={sharing}
            aria-label={sharing ? t("share.generating") : t("review.share")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-surface text-text-secondary transition-colors hover:text-primary disabled:opacity-40"
          >
            <Share2 size={17} className={sharing ? "animate-pulse" : ""} />
          </button>
        )}
      </header>

      {/* 周期 + 区间切换 */}
      <div className="mt-4 shrink-0">
        <div className="grid grid-cols-3 gap-1 rounded-full bg-border/30 p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => { setPeriod(p); setAnchor(new Date()); }}
              className={cn(
                "rounded-full py-1.5 text-xs font-semibold transition-all",
                period === p ? "bg-surface text-primary shadow-sm" : "text-text-secondary hover:text-text-primary",
              )}
            >
              {t(`review.period.${p}`)}
            </button>
          ))}
        </div>
        <div className="mt-2.5 flex items-center justify-center gap-5">
          <button onClick={goPrev} aria-label={t("review.prev")} className="flex h-7 w-7 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-border/30 active:scale-95">
            <ChevronLeft size={17} />
          </button>
          <div className="flex items-center gap-1.5 text-primary">
            <Sparkles size={14} />
            <span className="min-w-32 text-center text-sm font-semibold tracking-wide">{title}</span>
          </div>
          <button onClick={goNext} disabled={!canGoNext(period, anchor)} aria-label={t("review.next")} className="flex h-7 w-7 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-border/30 active:scale-95 disabled:opacity-25">
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      {/* 通透 Hero */}
      <section className="mt-4 shrink-0 rounded-card border border-border/70 bg-surface px-5 py-4">
        <div className="text-center">
          <p className="text-[11px] tracking-wide text-text-secondary">{t(`review.subtitle.${period}`)}</p>
          <div className="mt-0.5 flex items-baseline justify-center gap-1.5">
            <span className="text-[44px] font-semibold leading-none tracking-tight text-primary tabular-nums">{review.litCells}</span>
            <span className="text-sm font-medium text-text-primary">{t("review.cells")}</span>
          </div>
        </div>
        <div className="mt-3.5 border-t border-border/60 pt-3">
          <CellGrid lit={Math.min(100, review.litCells)} cols={25} gap="gap-1" />
        </div>
      </section>

      {/* 本期小结 —— 每个周期根据自己的数据实时生成 */}
      <section className="mt-2.5 shrink-0 rounded-card border border-primary/20 bg-primary/[0.06] px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-primary" />
          <span className="text-[10px] font-semibold tracking-wide text-primary">{t("review.summary.title")}</span>
        </div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-text-primary">
          {t(summary.key, summary.params)}
        </p>
        {summary.extraKey && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-text-secondary">
            {t(
              summary.extraKey,
              summary.extraParams?.category
                ? { ...summary.extraParams, category: t("cat." + summary.extraParams.category) }
                : summary.extraParams,
            )}
          </p>
        )}
      </section>

      {/* 数据行 */}
      <div className="mt-2.5 grid shrink-0 grid-cols-4 gap-2">
        <MiniStat icon={<Flame size={15} />} label={t("review.checkIns")} value={review.checkIns} accent />
        <MiniStat icon={<CalendarCheck size={15} />} label={t("review.activeDays")} value={review.activeDays} />
        <MiniStat icon={<Award size={15} />} label={t("review.longest")} value={`${review.longestStreak}${t("unit.days")}`} />
        <MiniStat icon={<Target size={15} />} label={t("review.completed")} value={review.completed.length} />
      </div>

      {/* 分布图 —— 固定舒适高度 */}
      <section className="mt-4 flex flex-col">
        <div className="mb-2 flex shrink-0 items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-text-primary">{t(`review.buckets.${period}`)}</h2>
          {review.bestBucket && (
            <span className="flex items-center gap-1 text-[10px] text-text-secondary">
              <Sparkles size={11} className="text-warning" />
              {t("review.bestBucket", { label: review.bestBucket.label || review.bestBucket.key, n: review.bestBucket.count })}
            </span>
          )}
        </div>
        {empty ? (
          <div className="flex h-44 flex-col items-center justify-center rounded-card border border-border/70 bg-surface text-center">
            <div className="text-3xl opacity-70">🌱</div>
            <p className="mt-2 text-xs font-medium text-text-primary">{t(`review.empty.${period}`)}</p>
            <p className="mt-0.5 text-[10px] text-text-secondary">{t(`review.emptySub.${period}`)}</p>
          </div>
        ) : (
          <div className="h-44 rounded-card border border-border/70 bg-surface px-2 py-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                <defs>
                  <linearGradient id="reviewBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent.css} stopOpacity={0.82} />
                    <stop offset="100%" stopColor={accent.css} stopOpacity={0.25} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: accent.axis }} axisLine={false} tickLine={false} interval={0} minTickGap={12} />
                <Tooltip cursor={{ fill: accent.grid, fillOpacity: 0.3 }} contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="url(#reviewBar)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* 年度热力图:整年的打卡轨迹,一眼看到坚持的密度 */}
      {period === "year" && yearReview && (
        <section className="mt-4 rounded-card border border-border/70 bg-surface p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-text-primary">{t("review.heatmap.title")}</h2>
            <span className="text-[10px] text-text-secondary">
              {t("review.heatmap.sub", { days: yearReview.activeDays })}
            </span>
          </div>
          <ActivityHeatmap
            heat={yearReview.heat}
            css={accent.css}
            grid={accent.grid}
            legendLess={t("review.heatmap.less")}
            legendMore={t("review.heatmap.more")}
            empty={t("review.heatmap.empty")}
          />
        </section>
      )}

      {/* 亮点摘要行 */}
      {!empty && (
        <div className="mt-3 grid shrink-0 grid-cols-3 gap-2 border-t border-border/50 pt-3">
          <Highlight label={t("review.topCategory")} value={review.topCategory ? t("cat." + review.topCategory.category) : t("review.none")} />
          <Highlight label={t("review.goalRank")} value={review.goalRanks[0] ? review.goalRanks[0].goal.title : t("review.none")} />
          <Highlight label={t(`review.completedWall.${period}`)} value={String(review.completed.length)} />
        </div>
      )}

      <SharePreview
        blob={shareBlob}
        filename={`track100-review-${review.anchorYear}.png`}
        shareTitle={t("review.cardTitle", { year: review.anchorYear })}
        onClose={() => setShareBlob(null)}
      />
    </main>
  );
}

function MiniStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface p-2.5">
      <div className={cn("mx-auto mb-1.5 flex h-6 w-6 items-center justify-center rounded-lg", accent ? "bg-warning/12 text-warning" : "bg-primary/10 text-primary")}>
        {icon}
      </div>
      <div className="truncate text-center text-base font-semibold tabular-nums leading-none tracking-tight text-text-primary">{value}</div>
      <div className="mt-1 truncate text-center text-[9px] text-text-secondary">{label}</div>
    </div>
  );
}

function Highlight({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-border/25 px-2.5 py-2 text-center">
      <div className="truncate text-[9px] text-text-secondary">{label}</div>
      <div className="mt-0.5 truncate text-xs font-medium text-text-primary">{value}</div>
    </div>
  );
}
