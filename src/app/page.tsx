"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useGoalStore } from "@/store/goal.store";
import { CATEGORIES } from "@/lib/goal-meta";
import { cellsLit } from "@/utils/progress";
import { cn } from "@/lib/cn";
import { GoalCard } from "@/components/goal/goal-card";
import type { GoalCategory } from "@/types/goal";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "夜深了";
  if (h < 12) return "早上好";
  if (h < 14) return "中午好";
  if (h < 18) return "下午好";
  return "晚上好";
}

export default function HomePage() {
  const hydrated = useGoalStore((s) => s.hydrated);
  const goals = useGoalStore((s) => s.goals);
  const history = useGoalStore((s) => s.history);
  const [filter, setFilter] = useState<GoalCategory | "all">("all");

  const active = useMemo(() => goals.filter((g) => !g.archived), [goals]);
  const litCells = useMemo(() => active.reduce((sum, g) => sum + cellsLit(g.current, g.target), 0), [active]);
  const checkIns = useMemo(() => history.filter((r) => r.value > 0).length, [history]);
  const visible = filter === "all" ? active : active.filter((g) => g.category === filter);
  const usedCategories = CATEGORIES.filter((c) => active.some((g) => g.category === c.value));

  if (!hydrated) return <div className="p-6 text-text-secondary">载入中…</div>;

  return (
    <main className="px-5 pt-6">
      {/* Progress-first hero */}
      <p className="text-sm text-text-secondary">{greeting()} 👋</p>
      <h1 className="mt-2 text-base text-text-secondary">
        你已点亮
        <span className="mx-2 text-4xl font-bold text-primary">{litCells}</span>
        个格子
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        {active.length} 个目标 · 累计打卡 {checkIns} 次
      </p>

      {active.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Category filter */}
          <div className="no-scrollbar -mx-5 mt-6 flex gap-2 overflow-x-auto px-5 pb-1">
            <Chip label="全部" active={filter === "all"} onClick={() => setFilter("all")} />
            {usedCategories.map((c) => (
              <Chip
                key={c.value}
                label={`${c.emoji} ${c.label}`}
                active={filter === c.value}
                onClick={() => setFilter(c.value)}
              />
            ))}
          </div>

          {/* Goal list */}
          <div className="mt-4 flex flex-col gap-3">
            {visible.map((g) => (
              <GoalCard key={g.id} goal={g} />
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
  return (
    <div className="mt-24 flex flex-col items-center text-center">
      <div className="text-6xl">🌱</div>
      <h2 className="mt-4 text-lg font-semibold text-text-primary">开始你的第一段旅程</h2>
      <p className="mt-1 text-sm text-text-secondary">创建一个长期目标,把成长变得看得见。</p>
      <Link
        href="/create"
        className="mt-6 rounded-btn bg-primary px-6 py-3 font-semibold text-white shadow-card active:scale-95"
      >
        创建目标
      </Link>
    </div>
  );
}
