"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { useGoalStore } from "@/store/goal.store";
import { useSettingsStore } from "@/store/settings.store";
import { categoryLabel, unitLabel } from "@/lib/goal-meta";
import { fmt, isComplete, percent, remaining } from "@/utils/progress";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/layout/page-header";
import { ProgressView } from "@/components/progress/progress-view";
import { Confetti } from "@/components/common/confetti";
import type { GrowthMode } from "@/types/goal";

const MODES: { value: GrowthMode; label: string }[] = [
  { value: "grid", label: "格子" },
  { value: "ring", label: "圆环" },
  { value: "bar", label: "进度条" },
  { value: "tree", label: "成长树" },
  { value: "heatmap", label: "热力图" },
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
  const [custom, setCustom] = useState("");
  const [celebrate, setCelebrate] = useState(false);

  // Fire confetti the moment a check-in crosses into 100%.
  const done = !!goal && isComplete(goal);
  const prevDone = useRef(false);
  useEffect(() => {
    if (done && !prevDone.current) {
      setCelebrate(true);
      prevDone.current = true;
      const t = setTimeout(() => setCelebrate(false), 1800);
      return () => clearTimeout(t);
    }
    if (!done) prevDone.current = false;
  }, [done]);

  if (!hydrated) return <div className="p-6 text-text-secondary">载入中…</div>;
  if (!goal) {
    return (
      <main className="p-6">
        <PageHeader title="目标不存在" back />
        <p className="mt-8 text-center text-text-secondary">这个目标可能已被删除。</p>
      </main>
    );
  }

  const records = historyOf(goal.id);

  const onDelete = () => {
    if (window.confirm(`确定删除「${goal.title}」?此操作不可撤销。`)) {
      deleteGoal(goal.id);
      router.push("/");
    }
  };

  const addCustom = () => {
    const n = Number(custom);
    if (Number.isFinite(n) && n !== 0) addProgress(goal.id, n);
    setCustom("");
  };

  return (
    <main className="min-h-screen pb-16">
      {celebrate && <Confetti />}
      <PageHeader
        title={goal.title}
        back
        action={
          <Link href={`/create?edit=${goal.id}`} aria-label="编辑" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-border/50">
            <Pencil size={18} />
          </Link>
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
            {fmt(goal.current)} / {fmt(goal.target)} {unitLabel(goal.unit)}
          </span>
        </div>
        <div className="mt-1 text-sm text-text-secondary">
          {categoryLabel(goal.category)} · {done ? <span className="text-success">已完成 🎉</span> : `还差 ${fmt(remaining(goal))} ${unitLabel(goal.unit)}`}
        </div>

        {/* view switch */}
        <div className="mt-5 flex gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium",
                mode === m.value ? "border-primary bg-primary text-white" : "border-border bg-surface text-text-secondary",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* the progress view */}
        <div className="mt-5 rounded-card border border-border bg-surface p-5">
          <ProgressView current={goal.current} total={goal.target} color={goal.color} mode={mode} history={records} />
        </div>

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
            <Plus size={20} /> 打卡 +{fmt(goal.step)} {unitLabel(goal.unit)}
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            type="number"
            step="any"
            placeholder="自定义数值"
            className="h-11 flex-1 rounded-input border border-border bg-surface px-4 outline-none focus:border-primary"
          />
          <button onClick={addCustom} className="h-11 rounded-btn border border-primary px-5 font-medium text-primary active:scale-95">
            记录
          </button>
        </div>

        {/* description */}
        {goal.description && (
          <p className="mt-6 rounded-card border border-border bg-surface p-4 text-sm text-text-secondary">{goal.description}</p>
        )}

        {/* history */}
        <h2 className="mt-8 text-sm font-semibold text-text-secondary">打卡记录</h2>
        <div className="mt-2 flex flex-col gap-2">
          {records.length === 0 && <p className="text-sm text-text-secondary">还没有记录,点上面打卡开始吧。</p>}
          {records.slice(0, 30).map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5 text-sm">
              <span className={r.value >= 0 ? "font-medium text-success" : "font-medium text-danger"}>
                {r.value > 0 ? "+" : ""}
                {fmt(r.value)} {unitLabel(goal.unit)}
              </span>
              <span className="text-text-secondary">{r.createdAt.slice(0, 16).replace("T", " ")}</span>
            </div>
          ))}
        </div>

        {/* delete */}
        <button onClick={onDelete} className="mt-8 flex items-center justify-center gap-2 rounded-btn py-3 text-sm text-danger">
          <Trash2 size={16} /> 删除目标
        </button>
      </div>
    </main>
  );
}
