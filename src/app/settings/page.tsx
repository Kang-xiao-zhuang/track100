"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Download, Globe, LayoutGrid, Moon, Palette, RotateCcw, Sun, Trash2, Trophy, Upload } from "lucide-react";
import { useSettingsStore } from "@/store/settings.store";
import { useGoalStore } from "@/store/goal.store";
import { STORAGE_KEYS, STORAGE_QUOTA, formatBytes, storageUsage, writeJSON } from "@/lib/storage";
import { autoBackupStatus, buildBackup, mergeBackup, parseBackup, previewBackup, replaceBackup, restoreSnapshot, snapshotAt, type BackupData, type BackupPreview } from "@/lib/backup";
import { useT } from "@/lib/i18n";
import { dayKey } from "@/utils/date";
import { isComplete } from "@/utils/progress";
import { saveFile } from "@/lib/native";
import { SettingsSkeleton } from "@/components/common/skeleton";
import { ViewStylePicker } from "@/components/common/view-style-picker";
import { AccentPicker } from "@/components/common/accent-picker";
import { DataHealthCard } from "@/components/common/data-health-card";
import { Zap } from "lucide-react";
import { accentHex, accentVars, DEFAULT_ACCENT_HUE } from "@/lib/accent";

const DAY = 86400000;

export default function SettingsPage() {
  const hydrated = useSettingsStore((s) => s.hydrated);
  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const oneTapEnabled = useSettingsStore((s) => s.oneTapEnabled) ?? true;
  const toggleOneTap = useSettingsStore((s) => s.toggleOneTap);
  const accentHue = useSettingsStore((s) => s.accentHue);
  const accentSat = useSettingsStore((s) => s.accentSat);
  const accentLight = useSettingsStore((s) => s.accentLight);
  const toggleLanguage = useSettingsStore((s) => s.toggleLanguage);
  const goals = useGoalStore((s) => s.goals);
  const restoreGoal = useGoalStore((s) => s.restoreGoal);
  const purgeGoal = useGoalStore((s) => s.purgeGoal);
  const setArchived = useGoalStore((s) => s.setArchived);
  const fileRef = useRef<HTMLInputElement>(null);
  const [openList, setOpenList] = useState<"trash" | "archived" | null>(null);
  const [showViews, setShowViews] = useState(false);
  const [showAccent, setShowAccent] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ data: BackupData; preview: BackupPreview } | null>(null);
  const homeView = useSettingsStore((s) => s.homeView) ?? "classic";
  const { t, lang } = useT();
  const router = useRouter();
  const accentColor = `rgb(${accentVars(accentHue ?? DEFAULT_ACCENT_HUE, theme, accentSat, accentLight).primary})`;

  const auto = useMemo(() => autoBackupStatus(), [hydrated]);
  const snapAt = useMemo(() => snapshotAt(), [hydrated]);
  const usage = useMemo(() => storageUsage(), [hydrated]);
  const deleted = useMemo(() => goals.filter((g) => g.deletedAt), [goals]);
  const archived = useMemo(() => goals.filter((g) => !g.deletedAt && g.archived), [goals]);
  const finishedCount = useMemo(() => goals.filter((g) => isComplete(g) && !g.deletedAt).length, [goals]);

  if (!hydrated) return <SettingsSkeleton />;

  const autoLabel = !auto.supported
    ? t("set.autoBackupWeb")
    : auto.at > 0
      ? t("set.autoBackupOn", { n: Math.floor((Date.now() - auto.at) / DAY) })
      : t("set.autoBackupNever");

  const onExport = async () => {
    const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], { type: "application/json" });
    try {
      const result = await saveFile(blob, `track100-backup-${dayKey(new Date())}.json`);
      if (result === "canceled") return; // 用户取消分享 —— 不算已备份
    } catch {
      return; // 写入/分享失败 —— 不算已备份
    }
    writeJSON(STORAGE_KEYS.lastExport, Date.now()); // 记录备份时间,清掉首页提醒
  };

  // 导入先解析 + 预览,不立刻写入;由用户在确认弹层里选「合并」或「覆盖恢复」。
  const onImport = async (file: File) => {
    try {
      const data = parseBackup(await file.text());
      setPendingImport({ data, preview: previewBackup(data) });
    } catch (e) {
      const key = e instanceof Error ? e.message : "import.invalid";
      window.alert(t("import.failed") + t(key));
    }
  };

  const confirmMerge = () => {
    if (!pendingImport) return;
    const r = mergeBackup(pendingImport.data);
    setPendingImport(null);
    window.alert(t("import.merged", { goals: r.addedGoals, records: r.addedRecords }));
    window.location.href = "/";
  };

  const confirmReplace = () => {
    if (!pendingImport) return;
    if (!window.confirm(t("import.replaceConfirm"))) return;
    replaceBackup(pendingImport.data);
    setPendingImport(null);
    window.location.href = "/";
  };

  const onRestoreSnapshot = () => {
    if (!window.confirm(t("set.snapshotConfirm"))) return;
    if (restoreSnapshot()) window.location.href = "/";
    else window.alert(t("set.snapshotNone"));
  };

  return (
    <main className="px-5 pt-6">
      <h1 className="text-xl font-bold">{t("set.title")}</h1>

      <section className="mt-4 overflow-hidden rounded-card border border-border bg-surface">
        <Row
          label={t("nav.hall")}
          value={t("hall.goalCount", { n: finishedCount })}
          icon={<Trophy size={18} />}
          onClick={() => router.push("/hall")}
        />
      </section>

      <section className="mt-4 overflow-hidden rounded-card border border-border bg-surface">
        <Row
          label={t("set.appearance")}
          value={theme === "dark" ? t("set.dark") : t("set.light")}
          icon={theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
          onClick={toggleTheme}
        />
        <Divider />
        <Row
          label={t("set.accent")}
          value={accentHue == null ? t("set.accentDefault") : accentHex(accentHue, theme, accentSat, accentLight).toUpperCase()}
          icon={<Palette size={18} />}
          onClick={() => setShowAccent((v) => !v)}
          swatch={accentColor}
        />
        {showAccent && (
          <div className="border-t border-border bg-surface">
            <AccentPicker />
          </div>
        )}
        <Divider />
        <Row
          label={t("set.homeView")}
          value={t("view." + homeView)}
          icon={<LayoutGrid size={18} />}
          onClick={() => setShowViews((v) => !v)}
        />
        {showViews && (
          <div className="border-t border-border bg-surface">
            <p className="px-4 pt-3 text-xs text-text-secondary">{t("set.homeViewHint")}</p>
            <ViewStylePicker />
          </div>
        )}
        <Divider />
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="text-text-secondary"><Zap size={18} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-text-primary">{t("oneTap.title")}</span>
            <span className="block text-[11px] text-text-secondary">{t("oneTap.sub")}</span>
          </span>
          <button
            role="switch"
            aria-checked={oneTapEnabled}
            onClick={toggleOneTap}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${oneTapEnabled ? "bg-primary" : "bg-border"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${oneTapEnabled ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
        <Divider />
        <Row
          label={t("set.language")}
          value={lang === "zh" ? "中文" : "English"}
          icon={<Globe size={18} />}
          onClick={toggleLanguage}
        />
        <Divider />
        <Row label={t("set.export")} icon={<Download size={18} />} onClick={onExport} />
        <Divider />
        <Row label={t("set.import")} icon={<Upload size={18} />} onClick={() => fileRef.current?.click()} />
        <Divider />
        <Row label={t("set.autoBackup")} value={autoLabel} />
        <Divider />
        <Row
          label={t("set.storage")}
          value={t("set.storageValue", {
            used: formatBytes(usage),
            total: formatBytes(STORAGE_QUOTA),
            pct: Math.round((usage / STORAGE_QUOTA) * 100),
          })}
        />
        {snapAt && (
          <>
            <Divider />
            <Row
              label={t("set.snapshot")}
              value={snapAt.slice(0, 10)}
              icon={<RotateCcw size={18} />}
              onClick={onRestoreSnapshot}
            />
          </>
        )}
        <Divider />
        <Row
          label={t("set.trash", { n: deleted.length })}
          icon={<Trash2 size={18} />}
          onClick={() => setOpenList(openList === "trash" ? null : "trash")}
        />
        {openList === "trash" && (
          <div className="border-t border-border px-4 py-2">
            {deleted.length === 0 ? (
              <p className="py-2 text-sm text-text-secondary">{t("set.emptyTrash")}</p>
            ) : (
              deleted.map((g) => (
                <div key={g.id} className="flex items-center gap-2 py-2 text-sm">
                  <span className="text-lg">{g.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-text-primary">{g.title}</span>
                  <button onClick={() => restoreGoal(g.id)} className="shrink-0 font-medium text-primary">
                    {t("set.restore")}
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(t("set.confirmPurge", { title: g.title }))) purgeGoal(g.id);
                    }}
                    className="shrink-0 font-medium text-danger"
                  >
                    {t("set.purge")}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
        <Divider />
        <Row
          label={t("set.archived", { n: archived.length })}
          icon={<Archive size={18} />}
          onClick={() => setOpenList(openList === "archived" ? null : "archived")}
        />
        {openList === "archived" && (
          <div className="border-t border-border px-4 py-2">
            {archived.length === 0 ? (
              <p className="py-2 text-sm text-text-secondary">{t("set.emptyArchived")}</p>
            ) : (
              archived.map((g) => (
                <div key={g.id} className="flex items-center gap-2 py-2 text-sm">
                  <span className="text-lg">{g.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-text-primary">{g.title}</span>
                  <button onClick={() => setArchived(g.id, false)} className="shrink-0 font-medium text-primary">
                    {t("d.unarchive")}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      <DataHealthCard onExport={onExport} />

      <section className="mt-4 overflow-hidden rounded-card border border-border bg-surface">
        <Row label={t("set.about")} value={t("set.aboutSub")} />
        <Divider />
        <Row label={t("set.version")} value={`v${process.env.NEXT_PUBLIC_APP_VERSION}`} />
      </section>

      <p className="mt-6 text-center text-xs text-text-secondary">{t("set.footer")}</p>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImport(f);
          e.target.value = "";
        }}
      />

      {pendingImport && (
        <ImportConfirm
          preview={pendingImport.preview}
          onClose={() => setPendingImport(null)}
          onMerge={confirmMerge}
          onReplace={confirmReplace}
        />
      )}
    </main>
  );
}

/** 导入前预览:让用户看清这份备份有多少数据、和本机的差异,再决定合并还是覆盖。 */
function ImportConfirm({
  preview,
  onClose,
  onMerge,
  onReplace,
}: {
  preview: BackupPreview;
  onClose: () => void;
  onMerge: () => void;
  onReplace: () => void;
}) {
  const { t } = useT();
  const dateText = preview.exportedAt
    ? new Date(preview.exportedAt).toLocaleString()
    : t("import.unknownTime");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("import.title")}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-modal border border-border bg-surface p-5"
      >
        <h2 className="text-lg font-semibold text-text-primary">{t("import.title")}</h2>
        <p className="mt-1 text-xs text-text-secondary">{t("import.sub")}</p>

        <div className="mt-4 rounded-xl bg-border/25 p-3">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-text-secondary">{t("import.exported")}</span>
            <span className="text-text-primary">{dateText}</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-surface px-3 py-2">
              <div className="text-[11px] text-text-secondary">{t("import.goals")}</div>
              <div className="mt-0.5 text-lg font-semibold tabular-nums text-text-primary">{preview.goalCount}</div>
              <div className="text-[10px] text-primary">{t("import.new", { n: preview.newGoals })}</div>
            </div>
            <div className="rounded-lg bg-surface px-3 py-2">
              <div className="text-[11px] text-text-secondary">{t("import.records")}</div>
              <div className="mt-0.5 text-lg font-semibold tabular-nums text-text-primary">{preview.recordCount}</div>
              <div className="text-[10px] text-primary">{t("import.new", { n: preview.newRecords })}</div>
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-text-secondary">
            {t("import.localNow", { goals: preview.localGoals, records: preview.localRecords })}
          </p>
        </div>

        <button
          onClick={onMerge}
          className="mt-4 h-11 w-full rounded-btn bg-primary text-sm font-semibold text-white dark:text-background"
        >
          {t("import.doMerge")}
        </button>
        <p className="mt-1 text-center text-[10px] text-text-secondary">{t("import.mergeHint")}</p>

        <button
          onClick={onReplace}
          className="mt-3 h-11 w-full rounded-btn border border-border text-sm font-medium text-text-primary"
        >
          {t("import.doReplace")}
        </button>
        <p className="mt-1 text-center text-[10px] text-text-secondary">{t("import.replaceHint")}</p>

        <button onClick={onClose} className="mt-3 w-full py-1 text-xs text-text-secondary">
          {t("import.cancel")}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, icon, onClick, swatch }: { label: string; value?: string; icon?: React.ReactNode; onClick?: () => void; swatch?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left disabled:cursor-default"
    >
      {icon && <span className="text-text-secondary">{icon}</span>}
      <span className="flex-1 text-text-primary">{label}</span>
      {swatch && <span className="h-5 w-5 shrink-0 rounded-full border border-border" style={{ backgroundColor: swatch }} />}
      {value && <span className="text-sm text-text-secondary">{value}</span>}
    </button>
  );
}

function Divider() {
  return <div className="mx-4 border-t border-border" />;
}
