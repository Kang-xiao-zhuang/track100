"use client";

import { memo, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowDown, ArrowUp, Pin, PinOff } from "lucide-react";
import { percent, remaining, fmt, isComplete, isHabit, isPinned, cellsLit, ratio } from "@/utils/progress";
import { habitStats } from "@/utils/habit";
import { goalRhythm, type Rhythm } from "@/utils/rhythm";
import { checkedToday } from "@/utils/insights";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { useGoalStore } from "@/store/goal.store";
import { useCheckinStore } from "@/store/checkin.store";
import { ProgressRing } from "@/components/progress/progress-ring";
import { SwipeableRow } from "@/components/common/swipeable-row";
import type { Goal, HomeView } from "@/types/goal";

interface CardData {
  goal: Goal;
  habit: boolean;
  /** 习惯型目标的统计(consistency/streak);累计型为 null。 */
  habitStat: ReturnType<typeof habitStats> | null;
  lit: number;
  ratioValue: number;
  headline: string;
  left: number;
  done: boolean;
  pinned: boolean;
  rhythm: Rhythm | null;
  todayDone: boolean;
}

/** Goal card — memoized to skip re-renders when sibling cards change.
 *  Entrance uses CSS animation (GPU-composited) instead of Framer Motion.
 *  view 决定首页卡片的视觉风格,所有风格共用打卡/排序/滑动/反馈逻辑。 */
export const GoalCard = memo(function GoalCard({
  goal,
  sortMode = false,
  view = "classic",
}: {
  goal: Goal;
  sortMode?: boolean;
  view?: HomeView;
}) {
  const addProgress = useGoalStore((s) => s.addProgress);
  const setPinned = useGoalStore((s) => s.setPinned);
  const moveGoal = useGoalStore((s) => s.moveGoal);
  const setArchived = useGoalStore((s) => s.setArchived);
  const deleteGoal = useGoalStore((s) => s.deleteGoal);
  // byGoal 索引引用稳定:只有本目标增删记录时才重算
  const records = useGoalStore((s) => s.historyOf(goal.id));
  const showCheckin = useCheckinStore((s) => s.show);
  const [bump, setBump] = useState(0);
  const { t } = useT();

  const habit = isHabit(goal);
  const stats = useMemo(() => (habit ? habitStats(goal, records) : null), [habit, goal, records]);
  const rhythm = useMemo(() => goalRhythm(goal, records), [goal, records]);
  const p = percent(goal.current, goal.target);
  const left = remaining(goal);
  const done = isComplete(goal);
  const pinned = isPinned(goal);
  // 四种视图共用的进度口径:习惯型看坚持率,累计型看 current/target
  const ratioValue = habit ? (stats!.consistency / 100) : ratio(goal.current, goal.target);
  const lit = habit ? stats!.consistency : cellsLit(goal.current, goal.target);
  const headline = habit ? `🔥 ${stats!.streak}` : `${p}%`;
  const todayDone = checkedToday(records);

  const data: CardData = { goal, habit, habitStat: stats, lit, ratioValue, headline, left, done, pinned, rhythm, todayDone };
  // 方形卡片(tile/bars)在首页以 2 列网格排布,外层改用竖向布局
  const isSquare = view === "tile" || view === "bars";

  const onQuickAdd = () => {
    const recordId = addProgress(goal.id, goal.step);
    if (recordId) {
      showCheckin({ goalId: goal.id, recordId, value: goal.step, unit: goal.unit });
      setBump((n) => n + 1);
    }
  };

  return (
    <SwipeableRow
      disabled={sortMode}
      actions={{
        pinned,
        archived: goal.archived,
        onPin: () => setPinned(goal.id, !pinned),
        onArchive: () => setArchived(goal.id, !goal.archived),
        onDelete: () => {
          if (window.confirm(t("d.confirmDelete", { title: goal.title }))) deleteGoal(goal.id);
        },
      }}
    >
      <div
        style={{ animation: "fade-up 0.3s both" }}
        className={cn(
          "relative flex rounded-card border border-border bg-surface shadow-card transition-shadow hover:shadow-hover",
          isSquare
            ? "h-full flex-col gap-2 p-3"
            : cn("items-center gap-1 p-4", (view === "compact" || view === "minimal") && "gap-3 p-3.5"),
        )}
      >
        {todayDone && !done && (
          <span
            title={t("card.todayDone")}
            aria-label={t("card.todayDone")}
            className="absolute right-2 top-2 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-success text-[9px] font-bold text-white shadow-sm"
          >
            ✓
          </span>
        )}
        {view === "classic" && <ClassicBody data={data} />}
        {view === "grid" && <GridBody data={data} />}
        {view === "compact" && <CompactBody data={data} />}
        {view === "minimal" && <MinimalBody data={data} />}
        {view === "matrix" && <MatrixBody data={data} />}
        {view === "tile" && <TileBody data={data} />}
        {view === "bars" && <BarsBody data={data} />}
        {view === "gauge" && <GaugeBody data={data} />}

        {sortMode ? (
          // 排序模式:隐藏快捷打卡,改成上移/下移/置顶三个小按钮
          <div className={cn("flex shrink-0 gap-1", isSquare ? "justify-center" : "flex-col")}>
            <SortButton label={t("home.moveUp")} onClick={() => moveGoal(goal.id, -1)}><ArrowUp size={15} /></SortButton>
            <SortButton label={t("home.moveDown")} onClick={() => moveGoal(goal.id, 1)}><ArrowDown size={15} /></SortButton>
            <SortButton label={pinned ? t("home.unpin") : t("home.pin")} onClick={() => setPinned(goal.id, !pinned)} active={pinned}>
              {pinned ? <PinOff size={15} /> : <Pin size={15} />}
            </SortButton>
          </div>
        ) : (
          // 首页快捷打卡:不进详情页,一次点击完成,5 秒内可撤销
          <motion.button
            key={bump}
            onClick={onQuickAdd}
            disabled={done}
            aria-label={t("home.quickAdd", { n: fmt(goal.step) })}
            initial={false}
            animate={bump > 0 ? { scale: [1, 1.22, 0.94, 1] } : { scale: 1 }}
            transition={{ duration: 0.34, ease: "easeOut" }}
            whileTap={{ scale: 0.9 }}
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full border font-bold",
              isSquare ? "h-9 w-full text-sm" : "h-11 min-w-11 px-2 text-sm",
              done ? "border-border text-text-secondary/50" : "border-primary/40 bg-primary/10 text-primary",
            )}
          >
            {done ? "✓" : `+${fmt(goal.step)}`}
          </motion.button>
        )}
      </div>
    </SwipeableRow>
  );
});

/** 经典:圆环进度 + 完整信息(原版样式)。 */
function ClassicBody({ data }: { data: CardData }) {
  const { t } = useT();
  const { goal, habit, habitStat: stats, headline, left, pinned, rhythm } = data;
  return (
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
          <span className="shrink-0 text-sm font-bold" style={{ color: goal.color }}>{headline}</span>
        </div>
        <div className="mt-0.5 text-sm text-text-secondary">
          {fmt(goal.current)} / {fmt(goal.target)} {t("u." + goal.unit)}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
          <span className="rounded-full bg-border/50 px-2 py-0.5">{t("cat." + goal.category)}</span>
          {habit ? (
            <span>{t("habit.consistency")} {stats!.consistency}%</span>
          ) : left > 0 ? (
            <span>{t("left.remaining", { n: fmt(left), unit: t("u." + goal.unit) })}</span>
          ) : (
            <span className="text-success">{t("left.done")}</span>
          )}
          {habit && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{t("f.typeHabit")}</span>}
          {rhythm && <RhythmBadge rhythm={rhythm} />}
        </div>
      </div>
    </Link>
  );
}

/** 格子带:一排小格看进度,最贴 Track100 的 100 格意象。 */
function GridBody({ data }: { data: CardData }) {
  const { t } = useT();
  const { goal, headline, pinned, lit } = data;
  return (
    <Link href={`/goals?id=${goal.id}`} className="flex min-w-0 flex-1 flex-col gap-2.5 py-0.5">
      <MiniCells lit={lit} color={goal.color} />
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg">{goal.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-text-primary">
              {pinned && <span className="mr-1">📌</span>}{goal.title}
            </h3>
            <span className="shrink-0 text-sm font-bold" style={{ color: goal.color }}>{headline}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-text-secondary">
            {t("cat." + goal.category)} · {fmt(goal.current)} / {fmt(goal.target)} {t("u." + goal.unit)}
          </p>
        </div>
      </div>
    </Link>
  );
}

/** 紧凑:小图标 + 标题 + 细进度条,一行一个,一屏看更多。 */
function CompactBody({ data }: { data: CardData }) {
  const { goal, headline, pinned, ratioValue } = data;
  return (
    <Link href={`/goals?id=${goal.id}`} className="flex min-w-0 flex-1 items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg">{goal.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-text-primary">
            {pinned && <span className="mr-1">📌</span>}{goal.title}
          </h3>
          <span className="shrink-0 text-sm font-bold" style={{ color: goal.color }}>{headline}</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border/60">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${Math.round(ratioValue * 100)}%`, backgroundColor: goal.color }}
          />
        </div>
      </div>
    </Link>
  );
}

/** 极简:圆形图标 + 标题 + 一排圆点,去掉多余信息。 */
function MinimalBody({ data }: { data: CardData }) {
  const { goal, pinned, lit } = data;
  return (
    <Link href={`/goals?id=${goal.id}`} className="flex min-w-0 flex-1 items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg">{goal.icon}</span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium text-text-primary">
          {pinned && <span className="mr-1">📌</span>}{goal.title}
        </h3>
        <div className="mt-1.5"><Dots lit={lit} color={goal.color} /></div>
      </div>
    </Link>
  );
}

/** 点阵打卡:左侧圆形图标+标题+数据,右侧圆点矩阵按进度点亮。 */
function MatrixBody({ data }: { data: CardData }) {
  const { t } = useT();
  const { goal, habit, headline, pinned, lit } = data;
  return (
    <Link href={`/goals?id=${goal.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-0.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base">
            {habit ? "🔥" : goal.icon}
          </span>
          <h3 className="truncate text-sm font-semibold text-text-primary">
            {pinned && <span className="mr-1">📌</span>}{goal.title}
          </h3>
        </div>
        <p className="truncate text-xs text-text-secondary">
          {t("cat." + goal.category)} · {fmt(goal.current)} / {fmt(goal.target)} {t("u." + goal.unit)}
        </p>
        <span className="text-sm font-bold" style={{ color: goal.color }}>{headline}</span>
      </div>
      <DotMatrix lit={lit} color={goal.color} />
    </Link>
  );
}

/** 大圆方块:方形卡片,中间大圆环 + 标题 + 数据。 */
function TileBody({ data }: { data: CardData }) {
  const { t } = useT();
  const { goal, habit, habitStat: stats, ratioValue, headline, pinned } = data;
  return (
    <Link href={`/goals?id=${goal.id}`} className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 py-1 text-center">
      <ProgressRing value={ratioValue} size={64} stroke={6} color={goal.color}>
        <span className="text-xl">{habit ? "🔥" : goal.icon}</span>
      </ProgressRing>
      <h3 className="w-full truncate text-sm font-semibold text-text-primary">
        {pinned && <span className="mr-0.5">📌</span>}{goal.title}
      </h3>
      <span className="text-xs font-bold" style={{ color: goal.color }}>
        {habit ? `${headline} · ${stats!.consistency}%` : headline}
      </span>
      <span className="truncate text-[11px] text-text-secondary">{t("cat." + goal.category)}</span>
    </Link>
  );
}

/** 柱状方块:方形卡片,顶部圆图标 + 标题,底部竖条进度。 */
function BarsBody({ data }: { data: CardData }) {
  const { t } = useT();
  const { goal, habit, headline, pinned, lit } = data;
  return (
    <Link href={`/goals?id=${goal.id}`} className="flex min-h-0 flex-1 flex-col justify-between gap-2 py-1">
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base">
            {habit ? "🔥" : goal.icon}
          </span>
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">
            {pinned && <span className="mr-0.5">📌</span>}{goal.title}
          </h3>
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-1">
          <span className="truncate text-[11px] text-text-secondary">{t("cat." + goal.category)}</span>
          <span className="shrink-0 text-xs font-bold" style={{ color: goal.color }}>{headline}</span>
        </div>
      </div>
      <Bars lit={lit} color={goal.color} />
    </Link>
  );
}

/** 半圆仪表:弧形进度 + 中央大数字读数,数字是主角、弧线做衬托。 */
function GaugeBody({ data }: { data: CardData }) {
  const { t } = useT();
  const { goal, habit, habitStat: stats, ratioValue, headline, left, pinned, rhythm } = data;
  const pct = Math.max(0, Math.min(100, Math.round(ratioValue * 100)));
  return (
    <Link href={`/goals?id=${goal.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-0.5">
      <HalfGauge value={pct} color={goal.color} label={`${pct}%`} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="truncate text-sm font-semibold text-text-primary">
          {pinned && <span className="mr-1">📌</span>}{goal.title}
        </h3>
        <p className="truncate text-xs text-text-secondary">
          {t("cat." + goal.category)} · {fmt(goal.current)} / {fmt(goal.target)} {t("u." + goal.unit)}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {habit ? (
            <span className="font-semibold" style={{ color: goal.color }}>{headline} · {stats!.consistency}%</span>
          ) : left > 0 ? (
            <span className="font-semibold" style={{ color: goal.color }}>
              {t("left.remaining", { n: fmt(left), unit: t("u." + goal.unit) })}
            </span>
          ) : (
            <span className="text-success">{t("left.done")}</span>
          )}
          {rhythm && <RhythmBadge rhythm={rhythm} />}
        </div>
      </div>
    </Link>
  );
}

/** 半圆弧仪表:pathLength 归一化到 100,dashoffset = 100 - 百分比,省去手算弧长。 */
function HalfGauge({ value, color, label }: { value: number; color: string; label: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative h-[58px] w-[100px] shrink-0" aria-hidden="true">
      <svg viewBox="0 0 100 56" className="h-full w-full">
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="rgb(var(--border) / 0.7)"
          strokeWidth="10"
          strokeLinecap="round"
          pathLength={100}
        />
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100"
          strokeDashoffset={100 - pct}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="absolute inset-x-0 bottom-0 text-center text-xl font-bold leading-none text-text-primary">
        {label}
      </span>
    </div>
  );
}

/** 7×6 圆点矩阵,按 lit 比例点亮;当前格用描边强调。 */
function DotMatrix({ lit, color }: { lit: number; color: string }) {
  const total = 42;
  const on = Math.round((lit / 100) * total);
  return (
    <div
      className="grid shrink-0 gap-[3px]"
      style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))", width: 76 }}
      aria-hidden="true"
    >
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="aspect-square rounded-full transition-colors duration-500"
          style={{
            backgroundColor: i < on ? color : "rgb(var(--border) / 0.6)",
            boxShadow: i === on ? `inset 0 0 0 2px rgb(var(--surface)), 0 0 0 1.5px ${color}` : undefined,
          }}
        />
      ))}
    </div>
  );
}

/** 7 根竖条,按 lit 比例点亮。 */
function Bars({ lit, color }: { lit: number; color: string }) {
  const total = 7;
  const on = Math.round((lit / 100) * total);
  return (
    <div className="flex h-9 items-end gap-1" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-colors duration-500"
          style={{ height: "100%", backgroundColor: i < on ? color : "rgb(var(--border) / 0.55)" }}
        />
      ))}
    </div>
  );
}

/** 卡片内的轻量格子带:20 格代表 0..100%。 */
function MiniCells({ lit, color }: { lit: number; color: string }) {
  const total = 20;
  const on = Math.round((lit / 100) * total);
  return (
    <div className="flex gap-[3px]" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="h-1.5 flex-1 rounded-full transition-colors duration-500"
          style={{ backgroundColor: i < on ? color : "rgb(var(--border) / 0.55)" }}
        />
      ))}
    </div>
  );
}

/** 卡片内的轻量圆点:10 点代表 0..100%。 */
function Dots({ lit, color }: { lit: number; color: string }) {
  const total = 10;
  const on = Math.round((lit / 100) * total);
  return (
    <div className="flex gap-1" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="h-1.5 w-1.5 rounded-full transition-colors duration-500"
          style={{ backgroundColor: i < on ? color : "rgb(var(--border) / 0.6)" }}
        />
      ))}
    </div>
  );
}

function RhythmBadge({ rhythm }: { rhythm: Rhythm }) {
  const { t } = useT();
  const label =
    rhythm.state === "ahead"
      ? `↑ ${t("rhythm.ahead", { n: rhythm.days! })}`
      : rhythm.state === "behind"
        ? `↓ ${t("rhythm.behind", { n: rhythm.days! })}`
        : rhythm.state === "idle"
          ? `⏸ ${t("rhythm.idle", { n: rhythm.idleDays! })}`
          : `● ${t("rhythm.ontime")}`;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 font-medium",
        rhythm.state === "ahead" && "bg-success/15 text-success",
        rhythm.state === "behind" && "bg-danger/15 text-danger",
        rhythm.state === "idle" && "bg-warning/15 text-warning",
        rhythm.state === "ontime" && "bg-border/50 text-text-secondary",
      )}
    >
      {label}
    </span>
  );
}

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
