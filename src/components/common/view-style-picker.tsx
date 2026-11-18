"use client";

import { useSettingsStore } from "@/store/settings.store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import type { HomeView } from "@/types/goal";

const VIEWS: { value: HomeView; nameKey: string; subKey: string }[] = [
  { value: "classic", nameKey: "view.classic", subKey: "view.classicSub" },
  { value: "grid", nameKey: "view.grid", subKey: "view.gridSub" },
  { value: "compact", nameKey: "view.compact", subKey: "view.compactSub" },
  { value: "minimal", nameKey: "view.minimal", subKey: "view.minimalSub" },
  { value: "matrix", nameKey: "view.matrix", subKey: "view.matrixSub" },
  { value: "tile", nameKey: "view.tile", subKey: "view.tileSub" },
  { value: "bars", nameKey: "view.bars", subKey: "view.barsSub" },
  { value: "gauge", nameKey: "view.gauge", subKey: "view.gaugeSub" },
];

/** 设置页里的视图风格选择器:八种卡片缩略图,点选即时生效。 */
export function ViewStylePicker() {
  const homeView = useSettingsStore((s) => s.homeView) ?? "classic";
  const setHomeView = useSettingsStore((s) => s.setHomeView);
  const { t } = useT();

  return (
    <div className="grid grid-cols-2 gap-3 px-4 py-3">
      {VIEWS.map((v) => {
        const active = homeView === v.value;
        return (
          <button
            key={v.value}
            onClick={() => setHomeView(v.value)}
            aria-pressed={active}
            className={cn(
              "flex flex-col overflow-hidden rounded-xl border-2 p-2 text-left transition-colors active:scale-[0.98]",
              active ? "border-primary bg-primary/5" : "border-border bg-background",
            )}
          >
            <Thumb view={v.value} />
            <div className="mt-2 flex items-center gap-1.5 px-0.5">
              <span className={cn("text-sm font-medium", active ? "text-primary" : "text-text-primary")}>{t(v.nameKey)}</span>
              {active && <span className="ml-auto h-2 w-2 rounded-full bg-primary" />}
            </div>
            <p className="mt-0.5 px-0.5 text-xs leading-snug text-text-secondary">{t(v.subKey)}</p>
          </button>
        );
      })}
    </div>
  );
}

/** 每种风格的迷你缩略图,用纯色块还原卡片布局。 */
function Thumb({ view }: { view: HomeView }) {
  const accent = "rgb(var(--primary))";
  const off = "rgb(var(--border) / 0.7)";
  const line = "rgb(var(--border))";

  if (view === "classic") {
    return (
      <div className="flex h-16 items-center gap-2 rounded-lg bg-surface px-2">
        <div className="h-8 w-8 shrink-0 rounded-full border-[3px]" style={{ borderColor: accent, borderRightColor: off }} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="h-1.5 w-4/5 rounded-full" style={{ backgroundColor: line }} />
          <div className="h-1 w-3/5 rounded-full" style={{ backgroundColor: off }} />
          <div className="h-1 w-2/5 rounded-full" style={{ backgroundColor: off }} />
        </div>
        <div className="h-4 w-4 shrink-0 rounded-full border" style={{ borderColor: accent }} />
      </div>
    );
  }
  if (view === "grid") {
    return (
      <div className="flex h-16 flex-col justify-center gap-2 rounded-lg bg-surface px-2">
        <div className="flex gap-[2px]">
          {Array.from({ length: 16 }, (_, i) => (
            <div key={i} className="h-1.5 flex-1 rounded-[1px]" style={{ backgroundColor: i < 10 ? accent : off }} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 shrink-0 rounded-md" style={{ backgroundColor: off }} />
          <div className="h-1.5 w-3/5 rounded-full" style={{ backgroundColor: line }} />
          <div className="ml-auto h-4 w-4 shrink-0 rounded-full border" style={{ borderColor: accent }} />
        </div>
      </div>
    );
  }
  if (view === "compact") {
    return (
      <div className="flex h-16 flex-col justify-center gap-2 rounded-lg bg-surface px-2">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 shrink-0 rounded-full" style={{ backgroundColor: off }} />
          <div className="h-1.5 w-2/5 rounded-full" style={{ backgroundColor: line }} />
          <div className="ml-auto h-1.5 w-6 rounded-full" style={{ backgroundColor: accent }} />
          <div className="h-4 w-4 shrink-0 rounded-full border" style={{ borderColor: accent }} />
        </div>
        <div className="h-1 w-full rounded-full" style={{ backgroundColor: off }}>
          <div className="h-1 w-3/5 rounded-full" style={{ backgroundColor: accent }} />
        </div>
      </div>
    );
  }
  if (view === "minimal") {
    return (
      <div className="flex h-16 items-center gap-2 rounded-lg bg-surface px-2">
        <div className="h-6 w-6 shrink-0 rounded-full" style={{ backgroundColor: off }} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="h-1.5 w-3/5 rounded-full" style={{ backgroundColor: line }} />
          <div className="flex gap-1">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: i < 5 ? accent : off }} />
            ))}
          </div>
        </div>
        <div className="h-4 w-4 shrink-0 rounded-full border" style={{ borderColor: accent }} />
      </div>
    );
  }
  if (view === "matrix") {
    return (
      <div className="flex h-16 items-center gap-2 rounded-lg bg-surface px-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: off }} />
            <div className="h-1.5 w-3/5 rounded-full" style={{ backgroundColor: line }} />
          </div>
          <div className="h-1 w-2/5 rounded-full" style={{ backgroundColor: off }} />
        </div>
        <div className="grid shrink-0 gap-[2px]" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))", width: 40 }}>
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className="aspect-square rounded-full" style={{ backgroundColor: i < 12 ? accent : off }} />
          ))}
        </div>
      </div>
    );
  }
  if (view === "tile") {
    return (
      <div className="flex h-16 flex-col items-center justify-center gap-1.5 rounded-lg bg-surface px-2">
        <div className="h-7 w-7 rounded-full border-[3px]" style={{ borderColor: accent, borderRightColor: off }} />
        <div className="h-1.5 w-3/5 rounded-full" style={{ backgroundColor: line }} />
        <div className="h-1 w-2/5 rounded-full" style={{ backgroundColor: off }} />
      </div>
    );
  }
  if (view === "bars") {
    return (
      <div className="flex h-16 flex-col justify-between rounded-lg bg-surface px-2 py-2">
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: off }} />
          <div className="h-1.5 w-3/5 rounded-full" style={{ backgroundColor: line }} />
          <div className="ml-auto h-1.5 w-4 rounded-full" style={{ backgroundColor: accent }} />
        </div>
        <div className="flex h-5 items-end gap-[3px]">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-full flex-1 rounded-[1px]" style={{ backgroundColor: i < 4 ? accent : off }} />
          ))}
        </div>
      </div>
    );
  }
  // gauge:左侧半圆弧 + 中央大数字点,右侧文字块 + 快捷圆钮
  return (
    <div className="flex h-16 items-center gap-2 rounded-lg bg-surface px-2">
      <div className="relative h-9 w-12 shrink-0">
        <svg viewBox="0 0 100 56" className="h-full w-full">
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={off} strokeWidth="12" strokeLinecap="round" />
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={accent} strokeWidth="12" strokeLinecap="round" pathLength={100} strokeDasharray="100" strokeDashoffset="28" />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center text-[10px] font-bold" style={{ color: line }}>70%</div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="h-1.5 w-4/5 rounded-full" style={{ backgroundColor: line }} />
        <div className="h-1 w-3/5 rounded-full" style={{ backgroundColor: off }} />
      </div>
      <div className="h-4 w-4 shrink-0 rounded-full border" style={{ borderColor: accent }} />
    </div>
  );
}
