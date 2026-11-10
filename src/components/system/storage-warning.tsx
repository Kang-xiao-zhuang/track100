"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { clearWriteError, hasWriteError, subscribeWriteError } from "@/lib/storage";
import { useT } from "@/lib/i18n";

/**
 * localStorage 写入失败时的醒目告警。
 * 之前写盘失败被静默吞掉,用户会以为打卡已保存,切到后台才丢失;
 * 对"数据全部存在本地"的产品这是最坏的故障模式,宁可打扰一次也要告知。
 */
export function StorageWarning() {
  const failed = useSyncExternalStore(subscribeWriteError, hasWriteError, () => false);
  const { t } = useT();
  if (!failed) return null;

  return (
    <div role="alert" className="pointer-events-none fixed inset-x-0 top-0 z-50 mx-auto max-w-app px-4 pt-3">
      <div className="pointer-events-auto flex items-start gap-3 rounded-card border border-danger bg-surface p-4 shadow-hover">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-text-primary">{t("storage.errorTitle")}</p>
          <p className="mt-1 leading-relaxed text-text-secondary">{t("storage.errorBody")}</p>
          <Link
            href="/settings"
            className="mt-2 inline-block font-semibold text-primary underline underline-offset-2"
          >
            {t("storage.exportNow")}
          </Link>
        </div>
        <button
          onClick={clearWriteError}
          aria-label={t("storage.dismiss")}
          className="shrink-0 p-0.5 text-text-secondary"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
