"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Send } from "lucide-react";
import { translate, useT } from "@/lib/i18n";
import { useReminderStore } from "@/store/reminder.store";
import { useSettingsStore } from "@/store/settings.store";
import { formatDateTime } from "@/utils/date";
import {
  checkReminderHealth,
  onAppResume,
  openBatterySettings,
  openExactAlarmSettings,
  openNotificationSettings,
  scheduleDailyReminders,
  sendTestNotification,
} from "@/lib/native";

type Tone = "ok" | "warn" | "bad" | "muted";

function StatusRow({
  label,
  value,
  tone = "muted",
  actionLabel,
  onAction,
}: {
  label: string;
  value: string;
  tone?: Tone;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const toneCls =
    tone === "ok" ? "text-success" : tone === "bad" ? "text-danger" : tone === "warn" ? "text-primary" : "text-text-secondary";
  return (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      <span className="shrink-0 text-text-secondary">{label}</span>
      <span className={`ml-auto truncate text-right font-medium ${toneCls}`}>{value}</span>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs font-medium text-primary"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/** 设置页的「提醒自检」:把不提醒的原因直接摆出来,并给出系统设置入口。 */
export function ReminderHealthPanel() {
  const { t, lang } = useT();
  const health = useReminderStore((s) => s.health);
  const busy = useReminderStore((s) => s.busy);
  const setHealth = useReminderStore((s) => s.setHealth);
  const enabled = useSettingsStore((s) => s.reminderEnabled);
  const time = useSettingsStore((s) => s.reminderTime);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  const refresh = () => {
    void checkReminderHealth().then(setHealth).catch(() => {});
  };

  useEffect(() => {
    refresh();
    // 从系统设置页返回时权限可能已改变
    return onAppResume(refresh);
  }, []);

  const flash = (msg: string) => {
    setMessage(msg);
    window.setTimeout(() => setMessage(""), 4000);
  };

  const onTest = async () => {
    setWorking(true);
    try {
      await sendTestNotification(translate(lang, "remind.testBody"));
      flash(t("remind.testSent"));
    } catch {
      flash(t("remind.permBlocked"));
    } finally {
      setWorking(false);
      refresh();
    }
  };

  const onReschedule = async () => {
    setWorking(true);
    try {
      const r = await scheduleDailyReminders(
        time,
        lang,
        translate(lang, "remind.body"),
        translate(lang, "notify.action"),
      );
      flash(r.ok ? t("remind.rescheduled") : t("remind.failed"));
    } catch {
      flash(t("remind.failed"));
    } finally {
      setWorking(false);
      refresh();
    }
  };

  const display = health?.display ?? "unknown";
  const permOk = display === "granted";
  const exact = health?.exactAlarm ?? "unknown";
  const battery = health?.batteryOptimized;
  const nextAt = health?.nextAt;

  return (
    <section className="mt-4 rounded-card border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-text-primary">{t("remind.diagTitle")}</h2>
      <p className="mt-1 text-xs text-text-secondary">{t("remind.hint")}</p>

      {!health ? (
        <p className="mt-3 text-sm text-text-secondary">{t("remind.checking")}</p>
      ) : (
        <div className="mt-3 divide-y divide-border/60">
          <StatusRow
            label={t("remind.perm")}
            value={permOk ? t("remind.stateOk") : display === "prompt" || display === "prompt-with-rationale" ? t("remind.statePrompt") : t("remind.stateDenied")}
            tone={permOk ? "ok" : "bad"}
            actionLabel={!permOk && health.native ? t("remind.open") : undefined}
            onAction={() => void openNotificationSettings()}
          />

          {health.native && exact !== "unknown" && exact !== "unsupported" && (
            <StatusRow
              label={t("remind.exact")}
              value={exact === "granted" ? t("remind.stateOk") : t("remind.exactLimited")}
              tone={exact === "granted" ? "ok" : "warn"}
              actionLabel={exact !== "granted" ? t("remind.open") : undefined}
              onAction={() => void openExactAlarmSettings()}
            />
          )}

          {health.native && battery !== null && (
            <StatusRow
              label={t("remind.battery")}
              value={battery ? t("remind.batteryLimited") : t("remind.batteryOk")}
              tone={battery ? "warn" : "ok"}
              actionLabel={battery ? t("remind.fix") : undefined}
              onAction={() => void openBatterySettings()}
            />
          )}

          {health.native && (
            <StatusRow
              label={t("remind.next")}
              value={
                !enabled
                  ? t("remind.disabled")
                  : nextAt
                    ? formatDateTime(nextAt)
                    : t("remind.notScheduled")
              }
              tone={!enabled ? "muted" : nextAt ? "ok" : "bad"}
            />
          )}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={onTest}
          disabled={working || busy}
          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-btn border border-primary text-sm font-medium text-primary disabled:opacity-50"
        >
          <Send size={15} /> {t("remind.test")}
        </button>
        {enabled && (
          <button
            onClick={onReschedule}
            disabled={working || busy}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-btn border border-border text-sm font-medium text-text-primary disabled:opacity-50"
          >
            <RefreshCw size={15} /> {t("remind.reschedule")}
          </button>
        )}
      </div>
      {message && <p className="mt-3 text-xs text-primary">{message}</p>}
    </section>
  );
}
