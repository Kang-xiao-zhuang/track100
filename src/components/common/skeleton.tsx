"use client";

import { cn } from "@/lib/cn";

/** 骨架块:脉动灰色区块,用于 hydrated 前占位,避免布局跳动。 */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("animate-pulse rounded-lg bg-border/50", className)} style={style} />;
}

/** 首页骨架:标题 + hero 数字 + 分类条 + 若干卡片。 */
export function HomeSkeleton() {
  return (
    <div className="px-5 pt-6" aria-busy="true">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-10 w-40" />
      <Skeleton className="mt-2 h-4 w-52" />
      <div className="no-scrollbar -mx-5 mt-6 flex gap-2 px-5">
        {[64, 72, 64].map((w, i) => (
          <Skeleton key={i} className="h-8 rounded-full" style={{ width: w }} />
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-card border border-border bg-surface p-4">
            <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/2" />
              <Skeleton className="mt-2 h-3 w-2/3" />
            </div>
            <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 统计页骨架:标题 + 4 宫格 + 完成率 + 图表 + 成就。 */
export function StatsSkeleton() {
  return (
    <div className="px-5 pt-6" aria-busy="true">
      <Skeleton className="h-6 w-20" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-card" />
        ))}
      </div>
      <Skeleton className="mt-3 h-24 rounded-card" />
      <Skeleton className="mt-6 h-4 w-28" />
      <Skeleton className="mt-2 h-44 rounded-card" />
      <Skeleton className="mt-6 h-4 w-28" />
      <Skeleton className="mt-2 h-36 rounded-card" />
    </div>
  );
}

/** 回顾页骨架:标题 + 年份切换 + hero + 宫格。 */
export function ReviewSkeleton() {
  return (
    <div className="px-5 pt-6" aria-busy="true">
      <Skeleton className="h-6 w-24" />
      <div className="mt-4 flex items-center justify-center gap-6">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-44 rounded-card" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-card" />
        ))}
      </div>
      <Skeleton className="mt-6 h-40 rounded-card" />
    </div>
  );
}

/** 设置页骨架:标题 + 一整块列表行。 */
export function SettingsSkeleton() {
  return (
    <div className="px-5 pt-6" aria-busy="true">
      <Skeleton className="h-6 w-20" />
      <div className="mt-4 overflow-hidden rounded-card border border-border bg-surface p-4">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border/60 py-3 last:border-0">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 目标详情骨架:返回栏 + 大数字 + 进度视图 + 打卡区。 */
export function DetailSkeleton() {
  return (
    <div className="px-5 pt-6" aria-busy="true">
      <Skeleton className="h-6 w-32" />
      <div className="mt-6 flex items-baseline gap-3">
        <Skeleton className="h-9 w-9 rounded" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-5 w-28" />
      </div>
      <Skeleton className="mt-2 h-4 w-40" />
      <Skeleton className="mt-6 h-10 w-full rounded-full" />
      <Skeleton className="mt-5 h-52 rounded-card" />
      <Skeleton className="mt-5 h-12 rounded-btn" />
    </div>
  );
}
