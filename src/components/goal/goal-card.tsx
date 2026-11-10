"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Pin, PinOff } from "lucide-react";
import { percent, remaining, fmt, isComplete, isHabit, isPinned } from "@/utils/progress";
import { habitStats } from "@/utils/habit";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { useGoalStore } from "@/store/goal.store";
import { useCheckinStore } from "@/store/checkin.store";
import { ProgressRing } from "@/components/progress/progress-ring";
import type { Goal } from "@/types/goal";

/** Goal card — memoized to skip re-renders when sibling cards change.
 *  Entrance uses CSS animation (GPU-composited) instead of Framer Motion. */
export const GoalCard = memo(function GoalCard({ goal, sortMode = false }: { goal: Goal; sortMode?: boolean }) {
  const { t } = useT();
  const addProgress = useGoalStore((s) => s.addProgress);
  const setPinned = useGoalStore((s) => s.setPinned);
  const moveGoal = useGoalStore((s) => s.moveGoal);
  // byGoal 索引引用稳定:只有本目标增删记录时才重算
  const records = useGoalStore((s) => s.historyOf(goal.id));
  const showCheckin = useCheckinStore((s) => s.show);

  const habit = isHabit(goal);
  const stats = useMemo(() => (habit ? habitStats(goal, records) : null), [habit, goal, records]);
  const p = percent(goal.current, goal.target);
  const left = remaining(goal);
  const done = isComplete(goal);
  const pinned = isPinned(goal);

  const onQuickAdd = () => {
    const recordId = addProgress(goal.id, goal.step);
    if (recordId) showCheckin({ goalId: goal.id, recordId, value: goal.step, unit: goal.unit });
  };

  return (
    <div
      style={{ animation: "fade-up 0.3s both" }}
      className="flex items-center gap-1 rounded-card border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-hover"
    >
      <Link href={`/goals?id=${goal.id}`} className="flex min-w-0 flex-1 items-center gap-4">
        <ProgressRing value={habit ? (stats!.consistency / 100) : (goal.target ? goal.current / goal.target : 0)} size={64} stroke={7} color={goal.color}>
          <span className="text-lg">{habit ? "🔥" : goal.icon}</span>
        </ProgressRing>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate text-base font-semibold text-text-primary">
              {pinned && <span className="mr-1">📌</span>}
              {goal.title}
            </h3>
            <span className="shrink-0 text-sm font-bold" style={{ color: goal.color }}>
              {habit ? `🔥 ${stats!.streak}` : `${p}%`}
            </span>
          </div>
          <div className="mt-0.5 text-sm text-text-secondary">
            {fmt(goal.current)} / {fmt(goal.target)} {t("u." + goal.unit)}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-text-secondary">
            <span className="rounded-full bg-border/50 px-2 py-0.5">{t("cat." + goal.category)}</span>
            {habit ? (
              <span>{t("habit.consistency")} {stats!.consistency}%</span>
            ) : left > 0 ? (
              <span>{t("left.remaining", { n: fmt(left), unit: t("u." + goal.unit) })}</span>
            ) : (
              <span className="text-success">{t("left.done")}</span>
            )}
            {habit && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{t("f.typeHabit")}</span>}
          </div>
        </div>
      </Link>

      {sortMode ? (
        // 排序模式:隐藏快捷打卡,改成上移/下移/置顶三个小按钮
        <div className="flex shrink-0 flex-col gap-1">
          <SortButton label={t("home.moveUp")} onClick={() => moveGoal(goal.id, -1)}><ArrowUp size={15} /></SortButton>
          <SortButton label={t("home.moveDown")} onClick={() => moveGoal(goal.id, 1)}><ArrowDown size={15} /></SortButton>
          <SortButton label={pinned ? t("home.unpin") : t("home.pin")} onClick={() => setPinned(goal.id, !pinned)} active={pinned}>
            {pinned ? <PinOff size={15} /> : <Pin size={15} />}
          </SortButton>
        </div>
      ) : (
        // 首页快捷打卡:不进详情页,一次点击完成,5 秒内可撤销
        <button
          onClick={onQuickAdd}
          disabled={done}
          aria-label={t("home.quickAdd", { n: fmt(goal.step) })}
          className={cn(
            "flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full border px-2 text-sm font-bold active:scale-95",
            done ? "border-border text-text-secondary/50" : "border-primary/40 bg-primary/10 text-primary",
          )}
        >
          {done ? "✓" : `+${fmt(goal.step)}`}
        </button>
      )}
    </div>
  );
});

function SortButton({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-7 w-8 items-center justify-center rounded-lg border active:scale-95",
        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-text-secondary",
      )}
    >
      {children}
    </button>
  );
}
