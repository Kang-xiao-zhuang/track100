"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Minus, Pencil, Plus, Share2, Trash2 } from "lucide-react";
import { useGoalStore } from "@/store/goal.store";
import { useSettingsStore } from "@/store/settings.store";
import { fmt, isComplete, percent, remaining } from "@/utils/progress";
import { pace, formatDate } from "@/utils/pace";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import { PageHeader } from "@/components/layout/page-header";
import { ProgressView } from "@/components/progress/progress-view";
import { Confetti } from "@/components/common/confetti";
import { drawShareCard } from "@/lib/share-card";
import type { GrowthMode } from "@/types/goal";

const MODES: { value: GrowthMode; key: string }[] = [
  { value: "grid", key: "mode.grid" },
  { value: "ring", key: "mode.ring" },
  { value: "bar", key: "mode.bar" },
  { value: "tree", key: "mode.tree" },
  { value: "heatmap", key: "mode.heatmap" },
];

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const hydrated = useGoalStore((s) => s.hydrated);
  const goal = useGoalStore((s) => s.goals.find((g) => g.id === id));
  const historyOf = useGoalStore((s) => s.historyOf);
  const addProgress = useGoalStore((s) => s.addProgress);
  const deleteGoal = useGoalStore((s) => s.deleteGoal);
  const mode = useSettingsStore((s) => s.growthMode);
  const setMode = useSettingsStore((s) => s.setGrowthMode);
  const { t, lang } = useT();
  const [custom, setCustom] = useState("");
  const [celebrate, setCelebrate] = useState(false);

  // Celebrate whenever a check-in crosses a milestone (25/50/75/100%).
  const done = !!goal && isComplete(goal);
  const pNow = goal ? percent(goal.current, goal.target) : 0;
  const prevPct = useRef<number | null>(null);
  useEffect(() => {
    const prev = prevPct.current;
    const crossed = prev !== null && pNow > prev && [25, 50, 75, 100].some((m) => prev < m && pNow >= m);
    prevPct.current = pNow;
    if (crossed) {
      setCelebrate(true);
      const timer = setTimeout(() => setCelebrate(false), 1800);
      return () => clearTimeout(timer);
    }
  }, [pNow]);

  // 必须在任何提前 return 之前调用(遵守 Hooks 规则);goal 为空时兜底空数组。
  const records = useMemo(() => (goal ? historyOf(goal.id) : []), [historyOf, goal]);
  const forecast = useMemo(() => (goal ? pace(goal, records) : null), [goal, records]);

  if (!hydrated) return <div className="p-6 text-text-secondary">{t("loading")}</div>;
  if (!goal) {
    return (
      <main className="p-6">
        <PageHeader title={t("d.notFound")} back />
        <p className="mt-8 text-center text-text-secondary">{t("d.notFoundSub")}</p>
      </main>
    );
  }

  const onDelete = () => {
    if (window.confirm(t("d.confirmDelete", { title: goal.title }))) {
      deleteGoal(goal.id);
      router.push("/");
    }
  };

  const addCustom = () => {
    const n = Number(custom);
    if (Number.isFinite(n) && n !== 0) addProgress(goal.id, n);
    setCustom("");
  };

  const onShare = async () => {
    const blob = await drawShareCard(goal, lang);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `track100-${goal.title}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  return (
    <main className="min-h-screen pb-16">
      {celebrate && <Confetti />}
      <PageHeader
        title={goal.title}
        back
        action={
          <div className="flex items-center gap-1">
            <button onClick={onShare} aria-label="分享" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-border/50">
              <Share2 size={18} />
            </button>
            <Link href={`/create?edit=${goal.id}`} aria-label="编辑" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-border/50">
              <Pencil size={18} />
            </Link>
          </div>
        }
      />

      <div className="px-5">
        {/* header numbers */}
        <div className="flex items-baseline gap-3">
          <span className="text-3xl">{goal.icon}</span>
          <span className="text-3xl font-bold" style={{ color: goal.color }}>
            {percent(goal.current, goal.target)}%
          </span>
          <span className="text-text-secondary">
            {fmt(goal.current)} / {fmt(goal.target)} {t("u." + goal.unit)}
          </span>
        </div>
        <div className="mt-1 text-sm text-text-secondary">
          {t("cat." + goal.category)} ·{" "}
          {done ? (
            <span className="text-success">{t("d.doneTag")}</span>
          ) : (
            t("left.remaining", { n: fmt(remaining(goal)), unit: t("u." + goal.unit) })
          )}
        </div>

        {/* view switch */}
        <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium",
                mode === m.value ? "border-primary bg-primary text-white" : "border-border bg-surface text-text-secondary",
              )}
            >
              {t(m.key)}
            </button>
          ))}
        </div>

        {/* the progress view */}
        <div className="mt-5 rounded-card border border-border bg-surface p-5">
          <ProgressView current={goal.current} total={goal.target} color={goal.color} mode={mode} history={records} />
        </div>

        {/* pace / projection */}
        {!done && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-card border border-border bg-surface px-4 py-3 text-sm">
            {forecast && forecast.projectedDate ? (
              <>
                <span className="text-text-secondary">
                  📅 {t("pace.projected", { date: formatDate(forecast.projectedDate, lang) })}
                </span>
                {forecast.aheadDays != null && (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                      forecast.aheadDays > 0
                        ? "bg-success/15 text-success"
                        : forecast.aheadDays < 0
                          ? "bg-danger/15 text-danger"
                          : "bg-border/50 text-text-secondary",
                    )}
                  >
                    {forecast.aheadDays > 0
                      ? t("pace.ahead", { n: forecast.aheadDays })
                      : forecast.aheadDays < 0
                        ? t("pace.behind", { n: -forecast.aheadDays })
                        : t("pace.ontime")}
                  </span>
                )}
              </>
            ) : (
              <span className="text-text-secondary">📅 {t("pace.none")}</span>
            )}
          </div>
        )}

        {/* check-in controls */}
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={() => addProgress(goal.id, -goal.step)}
            aria-label="减少"
            className="flex h-12 w-12 items-center justify-center rounded-btn border border-border bg-surface active:scale-95"
          >
            <Minus size={20} />
          </button>
          <button
            onClick={() => addProgress(goal.id, goal.step)}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-btn bg-primary font-semibold text-white shadow-card active:scale-95"
          >
            <Plus size={20} /> {t("d.checkin", { step: fmt(goal.step), unit: t("u." + goal.unit) })}
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            type="number"
            step="any"
            placeholder={t("d.customPh")}
            className="h-11 flex-1 rounded-input border border-border bg-surface px-4 outline-none focus:border-primary"
          />
          <button onClick={addCustom} className="h-11 rounded-btn border border-primary px-5 font-medium text-primary active:scale-95">
            {t("record")}
          </button>
        </div>

        {/* description */}
        {goal.description && (
          <p className="mt-6 rounded-card border border-border bg-surface p-4 text-sm text-text-secondary">{goal.description}</p>
        )}

        {/* history */}
        <h2 className="mt-8 text-sm font-semibold text-text-secondary">{t("d.history")}</h2>
        <div className="mt-2 flex flex-col gap-2">
          {records.length === 0 && <p className="text-sm text-text-secondary">{t("d.noRecords")}</p>}
          {records.slice(0, 30).map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5 text-sm">
              <span className={r.value >= 0 ? "font-medium text-success" : "font-medium text-danger"}>
                {r.value > 0 ? "+" : ""}
                {fmt(r.value)} {t("u." + goal.unit)}
              </span>
              <span className="text-text-secondary">{r.createdAt.slice(0, 16).replace("T", " ")}</span>
            </div>
          ))}
        </div>

        {/* delete */}
        <button onClick={onDelete} className="mt-8 flex items-center justify-center gap-2 rounded-btn py-3 text-sm text-danger">
          <Trash2 size={16} /> {t("d.delete")}
        </button>
      </div>
    </main>
  );
}
