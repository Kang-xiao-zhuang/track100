"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Database, Download, Trash2 } from "lucide-react";
import { useSettingsStore } from "@/store/settings.store";
import { useGoalStore } from "@/store/goal.store";
import { useT } from "@/lib/i18n";
import { autoBackupStatus } from "@/lib/backup";
import { STORAGE_KEYS, STORAGE_QUOTA, formatBytes, readJSON, storageUsage } from "@/lib/storage";
import { cn } from "@/lib/cn";

const DAY = 86400000;

/** 设置页的「数据健康」入口行：默认收起,点击展开备份/存储/回收站详情。 */
export function DataHealthCard({ onExport }: { onExport: () => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const goals = useGoalStore((s) => s.goals);
  const auto = useMemo(() => autoBackupStatus(), [hydrated]);
  const usage = useMemo(() => storageUsage(), [hydrated]);
  const trash = goals.filter((g) => g.deletedAt).length;

  const lastExport = readJSON<number>(STORAGE_KEYS.lastExport, 0);
  const exportDays = lastExport > 0 ? Math.floor((Date.now() - lastExport) / DAY) : null;
  const backupDays = auto.supported && auto.at > 0 ? Math.floor((Date.now() - auto.at) / DAY) : null;
  const storagePct = Math.round((usage / STORAGE_QUOTA) * 100);
  const backupOk = auto.supported && backupDays !== null && backupDays < 14;
  const storageOk = storagePct < 80;
  const trashOk = trash === 0;
  const allOk = backupOk && storageOk && trashOk;

  const backupText = !auto.supported
    ? t("set.autoBackupWeb")
    : backupDays === null
      ? t("set.healthBackupNever")
      : t("set.healthBackupDays", { n: backupDays });

  return (
    <section className="mt-4 overflow-hidden rounded-card border border-border bg-surface">
      {/* 入口行 */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-opacity active:opacity-70"
      >
        <span className="text-text-secondary"><Database size={18} /></span>
        <span className="min-w-0 flex-1 text-text-primary">{t("set.dataHealth")}</span>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
            allOk ? "bg-success/12 text-success" : "bg-warning/12 text-warning",
          )}
        >
          {allOk ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
          {allOk ? t("set.healthOk") : t("set.healthAttention")}
        </span>
        <ChevronDown
          size={16}
          className={cn("shrink-0 text-text-secondary transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {/* 展开详情 */}
      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <Cell label={t("set.healthBackup")} value={backupText} ok={backupOk} />
            <Cell
              label={t("set.healthStorage")}
              value={t("set.healthStoragePct", { pct: storagePct })}
              sub={formatBytes(usage)}
              ok={storageOk}
            />
            <Cell label={t("set.healthTrash")} value={String(trash)} ok={trashOk} icon={<Trash2 size={12} />} />
          </div>
          <p className="mt-3 text-center text-[11px] text-text-secondary">
            {t("set.lastExport", { when: exportDays === null ? t("set.never") : t("set.healthBackupDays", { n: exportDays }) })}
          </p>
          <button
            onClick={onExport}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-btn border border-primary/30 py-2 text-xs font-medium text-primary active:opacity-70"
          >
            <Download size={13} /> {t("set.export")}
          </button>
        </div>
      )}
    </section>
  );
}

function Cell({
  label,
  value,
  sub,
  ok,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  ok: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-border/25 px-3 py-2">
      <div className="flex items-center gap-1 text-[10px] text-text-secondary">
        {icon}
        {label}
        <span className={cn("ml-auto h-1.5 w-1.5 rounded-full", ok ? "bg-success" : "bg-warning")} />
      </div>
      <div className="mt-1 truncate text-sm font-semibold tabular-nums text-text-primary">{value}</div>
      {sub && <div className="text-[10px] text-text-secondary">{sub}</div>}
    </div>
  );
}
