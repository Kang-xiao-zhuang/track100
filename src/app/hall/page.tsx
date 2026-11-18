"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Award, Share2 } from "lucide-react";
import { useGoalStore } from "@/store/goal.store";
import { useSettingsStore } from "@/store/settings.store";
import { useT } from "@/lib/i18n";
import { isComplete } from "@/utils/progress";
import { dayKey } from "@/utils/date";
import { drawShareCard } from "@/lib/share-card";
import { accentPalette } from "@/lib/accent";
import { formatDate } from "@/utils/pace";
import { SharePreview } from "@/components/common/share-preview";
import { HallSkeleton } from "@/components/common/skeleton";

const DAY = 86400000;

interface Finished {
  goalId: string;
  blob: Blob;
}

/** 目标纪念馆：已完成目标单独陈列，带完成日期与用时，可生成分享卡。 */
export default function HallPage() {
  const hydrated = useGoalStore((s) => s.hydrated);
  const goals = useGoalStore((s) => s.goals);
  const history = useGoalStore((s) => s.history);
  const { t, lang } = useT();
  const accentHue = useSettingsStore((s) => s.accentHue);
  const accentSat = useSettingsStore((s) => s.accentSat);
  const accentLight = useSettingsStore((s) => s.accentLight);
  const [sharing, setSharing] = useState<string | null>(null);
  const [preview, setPreview] = useState<Finished | null>(null);

  const finished = useMemo(
    () => goals
      .filter((g) => isComplete(g) && !g.deletedAt)
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
    [goals],
  );
  const checkinsOf = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of history) if (r.value > 0) map.set(r.goalId, (map.get(r.goalId) ?? 0) + 1);
    return map;
  }, [history]);

  if (!hydrated) return <HallSkeleton />;

  const onShare = async (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal || sharing) return;
    setSharing(goalId);
    try {
      const blob = await drawShareCard(goal, lang, accentPalette(accentHue, accentSat, accentLight));
      setPreview({ goalId, blob });
    } catch {
      window.alert(t("share.failed"));
    } finally {
      setSharing(null);
    }
  };

  const daysUsed = (createdAt: string, completedAt?: string) => {
    const end = completedAt ? new Date(completedAt).getTime() : Date.now();
    return Math.max(1, Math.ceil((end - new Date(createdAt).getTime()) / DAY));
  };

  const goal = preview ? goals.find((g) => g.id === preview.goalId) : null;

  return (
    <main className="min-h-screen px-5 pb-10 pt-6">
      <Link href="/settings" aria-label={t("nav.settings")} className="mb-4 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-text-secondary active:opacity-70">
        <ArrowLeft size={18} />
      </Link>
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl">🏛️</div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">{t("hall.title")}</h1>
          <p className="mt-0.5 text-xs text-text-secondary">{t("hall.subtitle")}</p>
        </div>
      </div>

      {finished.length > 0 && (
        <p className="mt-4 text-xs text-text-secondary">{t("hall.goalCount", { n: finished.length })}</p>
      )}

      {finished.length === 0 ? (
        <div className="mt-24 flex flex-col items-center text-center">
          <div className="text-6xl opacity-80">🏆</div>
          <h2 className="mt-4 text-lg font-semibold text-text-primary">{t("hall.empty")}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t("hall.emptySub")}</p>
          <Link href="/" className="mt-6 rounded-btn bg-primary px-6 py-3 font-semibold text-white shadow-card active:scale-95">
            {t("createGoal")}
          </Link>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {finished.map((g, i) => (
            <article key={g.id} className="relative overflow-hidden rounded-card border border-border bg-surface p-4 shadow-card">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full" style={{ backgroundColor: `${g.color}14` }} />
              <div className="relative flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl" style={{ backgroundColor: `${g.color}20` }}>
                  {g.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Award size={13} className="shrink-0" style={{ color: g.color }} />
                    <h2 className="truncate text-base font-semibold text-text-primary">{g.title}</h2>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-text-secondary">
                    {g.completedAt && <span>{t("hall.completedOn", { date: formatDate(new Date(g.completedAt), lang) })}</span>}
                    <span>{t("hall.daysUsed", { n: daysUsed(g.createdAt, g.completedAt) })}</span>
                    <span>{dayKey(g.createdAt)} →</span>
                  </div>
                </div>
                <button
                  onClick={() => onShare(g.id)}
                  disabled={sharing === g.id}
                  aria-label={t("hall.share")}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-text-secondary active:opacity-70 disabled:opacity-40"
                >
                  <Share2 size={16} className={sharing === g.id ? "animate-pulse" : ""} />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-2.5 text-xs text-text-secondary">
                <span>{g.current} / {g.target} {t("u." + g.unit)}</span>
                <span className="ml-auto">·</span>
                <span>{t("stats.checkinsUnit", { n: checkinsOf.get(g.id) ?? 0 })}</span>
                {i === 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{t("hall.latest")}</span>}
              </div>
            </article>
          ))}
        </div>
      )}

      <SharePreview
        blob={preview?.blob ?? null}
        filename={`track100-hall-${preview?.goalId ?? "card"}.png`}
        shareTitle={`${goal?.title ?? t("hall.title")} · Track100`}
        onClose={() => setPreview(null)}
      />
    </main>
  );
}
