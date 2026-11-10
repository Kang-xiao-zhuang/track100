"use client";

import { useMemo, useRef, useState } from "react";
import { Archive, Bell, Download, Globe, Moon, RotateCcw, Sun, Trash2, Upload } from "lucide-react";
import { useSettingsStore } from "@/store/settings.store";
import { useGoalStore } from "@/store/goal.store";
import { STORAGE_KEYS, STORAGE_QUOTA, formatBytes, storageUsage, writeJSON } from "@/lib/storage";
import { autoBackupStatus, buildBackup, mergeBackup, parseBackup, restoreSnapshot, snapshotAt } from "@/lib/backup";
import { useT } from "@/lib/i18n";
import { dayKey } from "@/utils/date";
import { isNative, saveFile } from "@/lib/native";

const DAY = 86400000;

export default function SettingsPage() {
  const hydrated = useSettingsStore((s) => s.hydrated);
  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const toggleLanguage = useSettingsStore((s) => s.toggleLanguage);
  const reminderEnabled = useSettingsStore((s) => s.reminderEnabled);
  const reminderTime = useSettingsStore((s) => s.reminderTime);
  const setReminder = useSettingsStore((s) => s.setReminder);
  const goals = useGoalStore((s) => s.goals);
  const restoreGoal = useGoalStore((s) => s.restoreGoal);
  const purgeGoal = useGoalStore((s) => s.purgeGoal);
  const setArchived = useGoalStore((s) => s.setArchived);
  const fileRef = useRef<HTMLInputElement>(null);
  const [openList, setOpenList] = useState<"trash" | "archived" | null>(null);
  const { t, lang } = useT();

  const auto = useMemo(() => autoBackupStatus(), [hydrated]);
  const snapAt = useMemo(() => snapshotAt(), [hydrated]);
  const usage = useMemo(() => storageUsage(), [hydrated]);
  const deleted = useMemo(() => goals.filter((g) => g.deletedAt), [goals]);
  const archived = useMemo(() => goals.filter((g) => !g.deletedAt && g.archived), [goals]);

  if (!hydrated) return <div className="p-6 text-text-secondary">{t("loading")}</div>;

  const toggleReminder = async () => {
    if (!reminderEnabled) {
      // Android 上的权限申请在 PwaReminder 里随定时一起处理
      if (!isNative() && typeof Notification !== "undefined" && Notification.permission === "default") {
        await Notification.requestPermission();
      }
      setReminder(true);
    } else {
      setReminder(false);
    }
  };

  const notifDenied =
    reminderEnabled && !isNative() && typeof Notification !== "undefined" && Notification.permission === "denied";

  const autoLabel = !auto.supported
    ? t("set.autoBackupWeb")
    : auto.at > 0
      ? t("set.autoBackupOn", { n: Math.floor((Date.now() - auto.at) / DAY) })
      : t("set.autoBackupNever");

  const onExport = async () => {
    const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], { type: "application/json" });
    try {
      await saveFile(blob, `track100-backup-${dayKey(new Date())}.json`);
    } catch {
      return; // 用户取消分享 / 写入失败 —— 不算已备份
    }
    writeJSON(STORAGE_KEYS.lastExport, Date.now()); // 记录备份时间,清掉首页提醒
  };

  // 导入 = 严格校验 + 按 id 合并(不覆盖) + 自动留快照;任何失败都不动本地数据。
  const onImport = async (file: File) => {
    try {
      const data = parseBackup(await file.text());
      const r = mergeBackup(data);
      window.alert(t("import.merged", { goals: r.addedGoals, records: r.addedRecords }));
      window.location.href = "/";
    } catch (e) {
      const key = e instanceof Error ? e.message : "import.invalid";
      window.alert(t("import.failed") + t(key));
    }
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
          label={t("set.appearance")}
          value={theme === "dark" ? t("set.dark") : t("set.light")}
          icon={theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
          onClick={toggleTheme}
        />
        <Divider />
        <Row
          label={t("set.language")}
          value={lang === "zh" ? "中文" : "English"}
          icon={<Globe size={18} />}
          onClick={toggleLanguage}
        />
        <Divider />
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="text-text-secondary"><Bell size={18} /></span>
          <span className="flex-1 text-text-primary">{t("set.reminder")}</span>
          {reminderEnabled && (
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminder(true, e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-text-primary outline-none"
            />
          )}
          <button
            role="switch"
            aria-checked={reminderEnabled}
            onClick={toggleReminder}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${reminderEnabled ? "bg-primary" : "bg-border"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${reminderEnabled ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
        {notifDenied && <p className="px-4 pb-3 text-xs text-danger">{t("set.reminderDenied")}</p>}
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
    </main>
  );
}

function Row({ label, value, icon, onClick }: { label: string; value?: string; icon?: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left disabled:cursor-default"
    >
      {icon && <span className="text-text-secondary">{icon}</span>}
      <span className="flex-1 text-text-primary">{label}</span>
      {value && <span className="text-sm text-text-secondary">{value}</span>}
    </button>
  );
}

function Divider() {
  return <div className="mx-4 border-t border-border" />;
}
