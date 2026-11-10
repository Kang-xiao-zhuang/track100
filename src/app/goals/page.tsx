"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Archive, CalendarDays, Minus, Pencil, Plus, Share2, Trash2, X } from "lucide-react";
import { useGoalStore } from "@/store/goal.store";
import { useSettingsStore } from "@/store/settings.store";
import { useCheckinStore } from "@/store/checkin.store";
import { fmt, isComplete, isHabit, percent, remaining } from "@/utils/progress";
import { habitStats } from "@/utils/habit";
import { pace, formatDate } from "@/utils/pace";
import { dayKey, formatDateTime } from "@/utils/date";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import { PageHeader } from "@/components/layout/page-header";
import { ProgressView } from "@/components/progress/progress-view";
import { HabitView } from "@/components/progress/habit-view";
import { Confetti } from "@/components/common/confetti";
import { drawShareCard } from "@/lib/share-card";
import { saveFile } from "@/lib/native";
import type { GrowthMode } from "@/types/goal";

const MODES: { value: GrowthMode; key: string }[] = [
  { value: "grid", key: "mode.grid" },
  { value: "ring", key: "mode.ring" },
  { value: "bar", key: "mode.bar" },
  { value: "tree", key: "mode.tree" },
  { value: "heatmap", key: "mode.heatmap" },
];

export default function GoalDetailPage() {
  return (
    <Suspense fallback={null}>
      <GoalDetail />
    </Suspense>
  );
}

function GoalDetail() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const hydrated = useGoalStore((s) => s.hydrated);
  const goal = useGoalStore((s) => s.goals.find((g) => g.id === id));
  // byGoal 索引返回稳定引用:只有本目标新增/删除记录时才变
  const records = useGoalStore((s) => s.historyOf(id ?? ""));
  const addProgress = useGoalStore((s) => s.addProgress);
  const removeRecord = useGoalStore((s) => s.removeRecord);
  const deleteGoal = useGoalStore((s) => s.deleteGoal);
  const setArchived = useGoalStore((s) => s.setArchived);
  const showCheckin = useCheckinStore((s) => s.show);
  const mode = useSettingsStore((s) => s.growthMode);
  const setMode = useSettingsStore((s) => s.setGrowthMode);
  const { t, lang } = useT();
  const [custom, setCustom] = useState("");
  const [note, setNote] = useState("");
  const [visibleCount, setVisibleCount] = useState(30);
  const [celebrate, setCelebrate] = useState(false);
  // 补打卡:选中日期后,打卡/记录落到该日期;空串 = 关闭
  const [backfillDate, setBackfillDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  // 必须在任何提前 return 之前调用(遵守 Hooks 规则)。
  const forecast = useMemo(() => (goal ? pace(goal, records) : null), [goal, records]);
  const habit = !!goal && isHabit(goal);
  const habitData = useMemo(
    () => (goal && habit ? habitStats(goal, records) : null),
    [goal, habit, records],
  );

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
      deleteGoal(goal.id); // 软删除:移入回收站,历史记录保留
      router.push("/");
    }
  };

  // 补打卡时把所选日期(保留当天时刻)转成 ISO;未选则 undefined = 当前时间
  const backfillAt = () => {
    if (!backfillDate) return undefined;
    return new Date(`${backfillDate}T${new Date().toTimeString().slice(0, 8)}`).toISOString();
  };

  const checkIn = (delta: number) => {
    const recordId = addProgress(goal.id, delta, note.trim() || undefined, backfillAt());
    if (recordId) showCheckin({ goalId: goal.id, recordId, value: delta, unit: goal.unit });
    setNote("");
  };

  const addCustom = () => {
    const n = Number(custom);
    if (Number.isFinite(n) && n !== 0) {
      const recordId = addProgress(goal.id, n, note.trim() || undefined, backfillAt());
      if (recordId) showCheckin({ goalId: goal.id, recordId, value: n, unit: goal.unit });
    }
    setCustom("");
    setNote("");
  };

  const onShare = async () => {
    const blob = await drawShareCard(goal, lang);
    await saveFile(blob, `track100-${goal.title}.png`);
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
          <span className="text-3xl">{habit ? "🔥" : goal.icon}</span>
          <span className="text-3xl font-bold" style={{ color: goal.color }}>
            {habit && habitData
              ? `${habitData.streak} ${t(goal.habitPeriod === "weekly" ? "habit.weekUnit" : "habit.dayUnit")}`
              : `${percent(goal.current, goal.target)}%`}
          </span>
          <span className="text-text-secondary">
            {fmt(goal.current)} / {fmt(goal.target)} {t("u." + goal.unit)}
          </span>
        </div>
        <div className="mt-1 text-sm text-text-secondary">
          {t("cat." + goal.category)}
          {habit && <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{t("f.typeHabit")}</span>}
          {" · "}
          {habit && habitData
            ? t("habit.consistency") + ` ${habitData.consistency}%`
            : done
              ? t("d.doneTag")
              : t("left.remaining", { n: fmt(remaining(goal)), unit: t("u." + goal.unit) })}
        </div>

        {/* view switch — 习惯型有专属视图,不套用百分比成长模式 */}
        {!habit && (
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
        )}

        {/* the progress view */}
        <div className="mt-5 rounded-card border border-border bg-surface p-5">
          {habit && habitData ? (
            <HabitView stats={habitData} color={goal.color} period={goal.habitPeriod ?? "daily"} />
          ) : (
            <ProgressView current={goal.current} total={goal.target} color={goal.color} mode={mode} history={records} />
          )}
        </div>

        {/* pace / projection — 习惯型改显示本周期状态 */}
        {habit && habitData && !done ? (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-card border border-border bg-surface px-4 py-3 text-sm">
            <span className="text-text-secondary">
              {habitData.doneThisPeriod ? "✅ " + t("habit.periodDone") : "⏳ " + t("habit.periodPending")}
            </span>
            <span className="shrink-0 text-xs text-text-secondary">
              {t("habit.periods", { done: habitData.checkedPeriods, total: habitData.elapsedPeriods })}
            </span>
          </div>
        ) : !done && (
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
            onClick={() => checkIn(-goal.step)}
            aria-label="减少"
            className="flex h-12 w-12 items-center justify-center rounded-btn border border-border bg-surface active:scale-95"
          >
            <Minus size={20} />
          </button>
          <button
            onClick={() => checkIn(goal.step)}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-btn bg-primary font-semibold text-white shadow-card active:scale-95"
          >
            <Plus size={20} /> {t("d.checkin", { step: fmt(goal.step), unit: t("u." + goal.unit) })}
          </button>
        </div>

        {/* backfill date */}
        {(showDatePicker || backfillDate) && (
          <div className="mt-3 flex items-center gap-2">
            {showDatePicker ? (
              <input
                type="date"
                value={backfillDate}
                max={dayKey(new Date())}
                onChange={(e) => setBackfillDate(e.target.value)}
                aria-label={t("d.backfill")}
                className="h-11 flex-1 rounded-input border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:border-primary"
              />
            ) : (
              <span className="flex flex-1 items-center justify-between gap-2 rounded-input border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
                📅 {backfillDate}
                <button onClick={() => setBackfillDate("")} aria-label="清除">
                  <X size={14} />
                </button>
              </span>
            )}
          </div>
        )}

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
          <button
            onClick={() => setShowDatePicker((v) => !v)}
            aria-label={t("d.backfill")}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-btn border active:scale-95",
              showDatePicker || backfillDate ? "border-primary text-primary" : "border-border bg-surface text-text-secondary",
            )}
          >
            <CalendarDays size={18} />
          </button>
        </div>

        {/* 打卡备注(可选) */}
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={100}
          placeholder={t("d.notePh")}
          className="mt-3 h-11 w-full rounded-input border border-border bg-surface px-4 text-sm outline-none focus:border-primary"
        />

        {/* description */}
        {goal.description && (
          <p className="mt-6 rounded-card border border-border bg-surface p-4 text-sm text-text-secondary">{goal.description}</p>
        )}

        {/* history */}
        <h2 className="mt-8 text-sm font-semibold text-text-secondary">{t("d.history")}</h2>
        <div className="mt-2 flex flex-col gap-2">
          {records.length === 0 && <p className="text-sm text-text-secondary">{t("d.noRecords")}</p>}
          {records.slice(0, visibleCount).map((r) => (
            <div key={r.id} className="flex items-start gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={r.value >= 0 ? "font-medium text-success" : "font-medium text-danger"}>
                    {r.value > 0 ? "+" : ""}
                    {fmt(r.value)} {t("u." + goal.unit)}
                  </span>
                  {r.backfilled && (
                    <span className="rounded-full bg-border/50 px-1.5 py-0.5 text-[10px] text-text-secondary">
                      {t("d.backfillTag")}
                    </span>
                  )}
                </div>
                {r.note && <p className="mt-0.5 break-words text-xs text-text-secondary">{r.note}</p>}
              </div>
              <span className="shrink-0 pt-0.5 text-xs text-text-secondary">{formatDateTime(r.createdAt)}</span>
              <button
                onClick={() => removeRecord(goal.id, r.id)}
                aria-label={t("d.deleteRecord")}
                className="shrink-0 pt-0.5 text-text-secondary/60 hover:text-danger"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {records.length > visibleCount && (
            <button
              onClick={() => setVisibleCount((n) => n + 30)}
              className="mt-1 rounded-btn border border-border bg-surface py-2 text-xs text-text-secondary"
            >
              {t("d.loadMore", { shown: Math.min(visibleCount, records.length), total: records.length })}
            </button>
          )}
        </div>

        {/* archive / delete */}
        <div className="mt-8 flex items-center justify-center gap-6">
          <button
            onClick={() => setArchived(goal.id, !goal.archived)}
            className="flex items-center justify-center gap-2 rounded-btn py-3 text-sm text-text-secondary"
          >
            <Archive size={16} /> {goal.archived ? t("d.unarchive") : t("d.archive")}
          </button>
          <button onClick={onDelete} className="flex items-center justify-center gap-2 rounded-btn py-3 text-sm text-danger">
            <Trash2 size={16} /> {t("d.delete")}
          </button>
        </div>
      </div>
    </main>
  );
}
