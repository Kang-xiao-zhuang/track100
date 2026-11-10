"use client";

import type { HabitPeriod } from "@/types/goal";
import type { HabitStats } from "@/utils/habit";
import { useT } from "@/lib/i18n";

/**
 * 习惯型目标的专属进度视图:最近 N 个周期的打卡格 + 连击/最长/坚持率。
 * 与累计型的 100 格不同,这里每一格代表一个真实的周期(天或周)。
 */
export function HabitView({ stats, color, period }: { stats: HabitStats; color: string; period: HabitPeriod }) {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-4 py-1">
      <div className={`grid gap-1.5 ${period === "weekly" ? "grid-cols-6" : "grid-cols-7"}`}>
        {stats.recent.map((c) => (
          <div
            key={c.key}
            title={`${c.key} · ${c.count}`}
            className="aspect-square rounded-[6px] transition-colors"
            style={{
              backgroundColor: c.count > 0 ? color : "rgb(var(--border) / 0.5)",
              opacity: c.count > 0 ? Math.min(1, 0.45 + c.count * 0.2) : 1,
            }}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Cell label={t("habit.streak")} value={stats.streak} />
        <Cell label={t("habit.longest")} value={stats.longest} />
        <Cell label={t("habit.consistency")} value={`${stats.consistency}%`} />
      </div>

      <p className="text-center text-xs text-text-secondary">
        {t("habit.gridRecent", { n: stats.recent.length })}
        {" · "}
        {t("habit.periods", { done: stats.checkedPeriods, total: stats.elapsedPeriods })}
      </p>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-border/25 px-2 py-2.5 text-center">
      <div className="text-lg font-bold text-text-primary">{value}</div>
      <div className="mt-0.5 text-[11px] text-text-secondary">{label}</div>
    </div>
  );
}
