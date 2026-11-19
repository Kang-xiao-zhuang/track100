"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, ChevronDown, Plus, Zap } from "lucide-react";
import { useGoalStore } from "@/store/goal.store";
import { useCheckinStore } from "@/store/checkin.store";
import { useSettingsStore } from "@/store/settings.store";
import { CATEGORIES } from "@/lib/goal-meta";
import { cellsLit, isComplete, pickCheckinGoal, sortGoals } from "@/utils/progress";
import { currentStreak, todayCheckIns } from "@/utils/streak";
import { bestStreak, goalsPendingToday, journeyDay, weeklySummary } from "@/utils/insights";
import { getDailyCheer } from "@/lib/encouragement";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import { readJSON, STORAGE_KEYS } from "@/lib/storage";
import { autoBackupStatus } from "@/lib/backup";
import { GoalCard } from "@/components/goal/goal-card";
import { HomeSkeleton } from "@/components/common/skeleton";
import { AnimatedNumber } from "@/components/common/animated-number";
import type { GoalCategory } from "@/types/goal";

const DAY = 86400000;
const BACKUP_DAYS = 3;

function greetKey(): string {
  const h = new Date().getHours();
  if (h < 6) return "greet.dawn";
  if (h < 12) return "greet.morning";
  if (h < 14) return "greet.noon";
  if (h < 18) return "greet.afternoon";
  return "greet.evening";
}

export default function HomePage() {
  const hydrated = useGoalStore((s) => s.hydrated);
  const goals = useGoalStore((s) => s.goals);
  const history = useGoalStore((s) => s.history);
  const { t } = useT();
  const lang = useSettingsStore((s) => s.language);
  const homeView = useSettingsStore((s) => s.homeView) ?? "classic";
  const squareView = homeView === "tile" || homeView === "bars";
  const oneTapEnabled = useSettingsStore((s) => s.oneTapEnabled) ?? true;
  const addProgress = useGoalStore((s) => s.addProgress);
  const [filter, setFilter] = useState<GoalCategory | "all">("all");
  const [backupDismissed, setBackupDismissed] = useState(false);
  const [sortMode, setSortMode] = useState(false);
  const [showDone, setShowDone] = useState(false);
  // 只在挂载时读一次,避免每次 render 都碰 localStorage。
  // 原生端以自动备份时间为准,网页端只能看手动导出。
  const [lastBackup] = useState(() => {
    const auto = autoBackupStatus();
    if (auto.supported && auto.at > 0) return auto.at;
    return readJSON<number>(STORAGE_KEYS.lastExport, 0);
  });

  const active = useMemo(() => goals.filter((g) => !g.archived && !g.deletedAt), [goals]);
  const ordered = useMemo(() => sortGoals(active), [active]);
  const litCells = useMemo(() => active.reduce((sum, g) => sum + cellsLit(g.current, g.target), 0), [active]);
  const checkIns = useMemo(() => history.filter((r) => r.value > 0).length, [history]);
  const streak = useMemo(() => currentStreak(history), [history]);
  const todayCount = useMemo(() => todayCheckIns(history), [history]);
  const dayNo = useMemo(() => journeyDay(goals, history), [goals, history]);
  const best = useMemo(() => bestStreak(history), [history]);
  const weekly = useMemo(() => weeklySummary(goals, history), [goals, history]);
  const pending = useMemo(() => goalsPendingToday(goals, history), [goals, history]);
  const visible = useMemo(() => filter === "all" ? ordered : ordered.filter((g) => g.category === filter), [filter, ordered]);
  // 首页分两区:进行中在上、已完成折叠在下,避免完成的目标长期占住视野
  const ongoing = useMemo(() => visible.filter((g) => !isComplete(g)), [visible]);
  const finished = useMemo(() => visible.filter((g) => isComplete(g)), [visible]);
  const usedCategories = useMemo(() => CATEGORIES.filter((c) => active.some((g) => g.category === c.value)), [active]);

  const onTodayAdd = () => {
    const goal = pickCheckinGoal(goals, history);
    if (!goal) return;
    const recordId = addProgress(goal.id, goal.step);
    if (recordId) {
      useCheckinStore.getState().show({ goalId: goal.id, recordId, value: goal.step, unit: goal.unit });
    }
  };

  const [batchDone, setBatchDone] = useState(0);
  const onOneTap = () => {
    const list = pending.filter((g) => !isComplete(g));
    if (!list.length) return;
    for (const g of list) addProgress(g.id, g.step);
    setBatchDone(list.length);
    setTimeout(() => setBatchDone(0), 2500);
  };

  if (!hydrated) return <HomeSkeleton />;

  const backupDays = lastBackup ? Math.floor((Date.now() - lastBackup) / DAY) : null;
  const showBackup =
    !backupDismissed && active.length > 0 && (lastBackup === 0 || (backupDays !== null && backupDays >= BACKUP_DAYS));

  return (
    <main className="px-5 pt-6">
      {/* Progress-first hero */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{t(greetKey())} 👋</p>
        {dayNo > 0 && (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            {t("home.journeyDay", { n: dayNo })}
          </span>
        )}
      </div>
      <h1 className="mt-2 text-base text-text-secondary">
        {t("home.heroPrefix")}
        <AnimatedNumber value={litCells} className="mx-2 text-4xl font-bold text-primary" />
        {t("home.heroSuffix")}
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        {t("home.summary", { goals: active.length, checkins: checkIns })}
      </p>

      {active.length > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-card border border-primary/20 bg-primary/5 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary">
              {todayCount > 0 ? t("home.todayFilled", { n: todayCount }) : t("home.todayEmpty")}
            </p>
            <p className="mt-0.5 truncate text-xs text-text-secondary">{getDailyCheer(lang)}</p>
            {streak === 0 && best > 0 && (
              <p className="mt-0.5 text-[11px] text-text-secondary">🏆 {t("home.bestStreak", { n: best })}</p>
            )}
          </div>
          {streak > 0 && (
            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              🔥 {t("home.streak", { n: streak })}
            </span>
          )}
          {todayCount === 0 && (
            <button
              onClick={onTodayAdd}
              disabled={!active.some((g) => !isComplete(g))}
              aria-label={t("home.todayAdd")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white active:scale-95 disabled:opacity-40"
            >
              <Plus size={17} />
            </button>
          )}
        </div>
      )}

      {/* 批量打卡:开启后显示,一次给今天所有待打卡目标 +1 */}
      {active.length > 0 && oneTapEnabled && pending.length > 0 && (
        <button
          onClick={onOneTap}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-btn border border-primary/30 bg-primary/5 py-2.5 text-sm font-medium text-primary active:scale-[0.99]"
        >
          <Zap size={15} />
          {batchDone > 0 ? t("oneTap.result", { n: batchDone }) : t("oneTap.title")}
          {batchDone === 0 && <span className="text-xs font-normal opacity-70">· {pending.length}</span>}
        </button>
      )}

      {/* 每周小结:一眼看到本周节奏 */}
      {active.length > 0 && (
        <div className="mt-2 rounded-card border border-border bg-surface px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-primary">{t("home.weeklyTitle")}</span>
            <span className="text-[10px] text-text-secondary">
              {weekly.checkIns > 0
                ? t("home.weeklyStat", { n: weekly.checkIns, d: weekly.activeDays })
                : ""}
            </span>
          </div>
          {weekly.topGoal ? (
            <p className="mt-1.5 truncate text-xs text-text-secondary">
              ✨ {t("home.weeklyTop", { title: weekly.topGoal.title })}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-text-secondary">{t("home.weeklyEmpty")}</p>
          )}
        </div>
      )}

      {showBackup && (
        <div className="mt-4 flex items-center gap-2 rounded-card border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm">
          <Link href="/settings" className="flex-1 font-medium text-warning">
            {lastBackup === 0 ? t("backup.never") : t("backup.warn", { n: backupDays! })}
          </Link>
          <button aria-label="dismiss" onClick={() => setBackupDismissed(true)} className="text-warning/70">
            ✕
          </button>
        </div>
      )}

      {active.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Sort mode toggle */}
          <div className="mt-6 flex items-center justify-between gap-2">
            <span className="text-xs text-text-secondary">{sortMode ? t("home.sortHint") : ""}</span>
            <button
              onClick={() => setSortMode((v) => !v)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
                sortMode ? "border-primary bg-primary text-white" : "border-border bg-surface text-text-secondary",
              )}
            >
              <ArrowUpDown size={14} /> {sortMode ? t("home.sortDone") : t("home.sort")}
            </button>
          </div>

          {/* Category filter */}
          <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1">
            <Chip label={t("all")} active={filter === "all"} onClick={() => setFilter("all")} />
            {usedCategories.map((c) => (
              <Chip
                key={c.value}
                label={`${c.emoji} ${t("cat." + c.value)}`}
                active={filter === c.value}
                onClick={() => setFilter(c.value)}
              />
            ))}
          </div>

          {/* 进行中 */}
          <div
            className={cn(
              "mt-4",
              squareView ? "grid grid-cols-2 gap-2.5" : cn("flex flex-col", homeView === "classic" || homeView === "grid" ? "gap-3" : "gap-2"),
            )}
          >
            {ongoing.map((g) => (
              <GoalCard key={g.id} goal={g} sortMode={sortMode} view={homeView} />
            ))}
            {ongoing.length === 0 && (
              <p className={cn("rounded-card border border-dashed border-border px-4 py-6 text-center text-sm text-text-secondary", squareView && "col-span-2")}>
                {finished.length > 0 ? t("home.allDone") : t("home.noneInFilter")}
              </p>
            )}
          </div>

          {/* 已完成:默认折叠;排序模式只作用于进行中,故隐藏 */}
          {finished.length > 0 && !sortMode && (
            <div className="mt-6">
              <button
                onClick={() => setShowDone((v) => !v)}
                aria-expanded={showDone}
                className="flex w-full items-center justify-between rounded-card border border-border bg-surface px-4 py-3 text-sm font-medium text-text-secondary"
              >
                <span>{t("home.finished", { n: finished.length })}</span>
                <ChevronDown size={16} className={cn("transition-transform", showDone && "rotate-180")} />
              </button>
              {showDone && (
                <div
                  className={cn(
                    "mt-3",
                    squareView ? "grid grid-cols-2 gap-2.5" : cn("flex flex-col", homeView === "classic" || homeView === "grid" ? "gap-3" : "gap-2"),
                  )}
                >
                  {finished.map((g) => (
                    <GoalCard key={g.id} goal={g} view={homeView} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Floating action button, aligned to the centered column */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto max-w-app">
        <Link
          href="/create"
          aria-label="创建目标"
          className="pointer-events-auto absolute bottom-24 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-hover transition-transform active:scale-95"
        >
          <Plus size={28} />
        </Link>
      </div>
    </main>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
        active ? "border-primary bg-primary text-white" : "border-border bg-surface text-text-secondary",
      )}
    >
      {label}
    </button>
  );
}

function EmptyState() {
  const { t } = useT();
  return (
    <div className="mt-24 flex flex-col items-center text-center">
      <div className="text-6xl">🌱</div>
      <h2 className="mt-4 text-lg font-semibold text-text-primary">{t("empty.title")}</h2>
      <p className="mt-1 text-sm text-text-secondary">{t("empty.sub")}</p>
      <Link
        href="/create"
        className="mt-6 rounded-btn bg-primary px-6 py-3 font-semibold text-white shadow-card active:scale-95"
      >
        {t("createGoal")}
      </Link>
    </div>
  );
}
