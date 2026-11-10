"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Plus } from "lucide-react";
import { useGoalStore } from "@/store/goal.store";
import { CATEGORIES } from "@/lib/goal-meta";
import { cellsLit, sortGoals } from "@/utils/progress";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import { readJSON, STORAGE_KEYS } from "@/lib/storage";
import { GoalCard } from "@/components/goal/goal-card";
import type { GoalCategory } from "@/types/goal";

const DAY = 86400000;
const BACKUP_DAYS = 14;

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
  const [filter, setFilter] = useState<GoalCategory | "all">("all");
  const [backupDismissed, setBackupDismissed] = useState(false);
  const [sortMode, setSortMode] = useState(false);
  // 只在挂载时读一次,避免每次 render 都碰 localStorage
  const [lastExport] = useState(() => readJSON<number>(STORAGE_KEYS.lastExport, 0));

  const active = useMemo(() => goals.filter((g) => !g.archived && !g.deletedAt), [goals]);
  const ordered = useMemo(() => sortGoals(active), [active]);
  const litCells = useMemo(() => active.reduce((sum, g) => sum + cellsLit(g.current, g.target), 0), [active]);
  const checkIns = useMemo(() => history.filter((r) => r.value > 0).length, [history]);
  const visible = useMemo(() => filter === "all" ? ordered : ordered.filter((g) => g.category === filter), [filter, ordered]);
  const usedCategories = useMemo(() => CATEGORIES.filter((c) => active.some((g) => g.category === c.value)), [active]);

  if (!hydrated) return <div className="p-6 text-text-secondary">{t("loading")}</div>;

  const backupDays = lastExport ? Math.floor((Date.now() - lastExport) / DAY) : null;
  const showBackup =
    !backupDismissed && active.length > 0 && (lastExport === 0 || (backupDays !== null && backupDays >= BACKUP_DAYS));

  return (
    <main className="px-5 pt-6">
      {/* Progress-first hero */}
      <p className="text-sm text-text-secondary">{t(greetKey())} 👋</p>
      <h1 className="mt-2 text-base text-text-secondary">
        {t("home.heroPrefix")}
        <span className="mx-2 text-4xl font-bold text-primary">{litCells}</span>
        {t("home.heroSuffix")}
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        {t("home.summary", { goals: active.length, checkins: checkIns })}
      </p>

      {showBackup && (
        <div className="mt-4 flex items-center gap-2 rounded-card border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm">
          <Link href="/settings" className="flex-1 font-medium text-warning">
            {lastExport === 0 ? t("backup.never") : t("backup.warn", { n: backupDays! })}
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

          {/* Goal list */}
          <div className="mt-4 flex flex-col gap-3">
            {visible.map((g) => (
              <GoalCard key={g.id} goal={g} sortMode={sortMode} />
            ))}
          </div>
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
