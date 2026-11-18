"use client";

import { useEffect, useMemo } from "react";
import { useSettingsStore } from "@/store/settings.store";
import { useReminderStore } from "@/store/reminder.store";
import { STORAGE_KEYS, readJSON, writeJSON } from "@/lib/storage";
import { translate } from "@/lib/i18n";
import { dayKey } from "@/utils/date";
import {
  cancelDailyReminders,
  checkReminderHealth,
  ensureDailyReminders,
  isNative,
  onAppResume,
  scheduleDailyReminders,
} from "@/lib/native";

/**
 * 注册 Service Worker(使 App 可安装为 PWA)+ 每日提醒。
 * Web:页面打开时轮询,到点发一条前台通知(无后端做不到真后台推送)。
 * Android:系统本地通知,App 关闭也会触发;这里是唯一的排程入口,
 *          设置变化强制重排、回前台幂等补齐,结果写入 reminder.store 供设置页自检。
 */
export function PwaReminder() {
  const hydrated = useSettingsStore((s) => s.hydrated);
  const enabled = useSettingsStore((s) => s.reminderEnabled);
  const time = useSettingsStore((s) => s.reminderTime);
  const times = useSettingsStore((s) => s.reminderTimes);
  const lang = useSettingsStore((s) => s.language);
  const effectiveTimes = useMemo(() => (times?.length ? times : [time]), [times, time]);

  // 注册 SW(原生 App 不需要)。
  // URL 带构建版本:升版本后浏览器会安装新 SW,activate 清掉旧缓存;
  // 已在旧 SW 控制下的页面刷新一次,避免继续用旧版 JS。
  useEffect(() => {
    if (isNative() || !("serviceWorker" in navigator)) return;
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloaded = false;
    const onControllerChange = () => {
      if (!hadController || reloaded) return; // 首次安装不刷新
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    const version = process.env.NEXT_PUBLIC_APP_VERSION || "dev";
    navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(version)}`).catch(() => {});
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  // Android 唯一排程入口:开关 / 时间 / 语言变化,以及 App 冷启动。
  useEffect(() => {
    if (!hydrated || !isNative()) return;
    const store = useReminderStore.getState();
    const body = translate(lang, "remind.body");
    const action = translate(lang, "notify.action");
    store.setBusy(true);

    const task = enabled
      ? scheduleDailyReminders(effectiveTimes, lang, body, action)
      : cancelDailyReminders().then(() => null);

    task
      .then((r) => {
        store.setLastResult(r);
        return checkReminderHealth(effectiveTimes);
      })
      .then((h) => store.setHealth(h))
      .catch(() => store.setLastResult({ ok: false, reason: "error" }))
      .finally(() => store.setBusy(false));
  }, [hydrated, enabled, effectiveTimes, lang]);

  // 回前台:只在闹钟被系统清掉 / 快用完 / 设置变了时补排,不动已排好的通知。
  useEffect(() => {
    if (!hydrated || !isNative() || !enabled) return;
    const body = translate(lang, "remind.body");
    const action = translate(lang, "notify.action");
    return onAppResume(() => {
      void ensureDailyReminders(effectiveTimes, lang, body, action)
        .then((r) => {
          useReminderStore.getState().setLastResult(r);
          return checkReminderHealth(effectiveTimes);
        })
        .then((h) => useReminderStore.getState().setHealth(h))
        .catch(() => {});
    });
  }, [hydrated, enabled, effectiveTimes, lang]);

  // Web:每日提醒轮询(每个时段独立记录,一天可提醒多次)
  useEffect(() => {
    if (!hydrated || !enabled || isNative()) return;
    if (typeof Notification === "undefined") return;
    void checkReminderHealth(effectiveTimes).then((h) => useReminderStore.getState().setHealth(h)).catch(() => {});

    const check = () => {
      if (Notification.permission !== "granted") return;
      const now = new Date();
      const today = dayKey(now);
      for (const t of effectiveTimes) {
        const [h, m] = t.split(":").map(Number);
        const due = now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
        if (!due) continue;
        // 每个时段用独立 key 记录当天是否已提醒
        const key = `${STORAGE_KEYS.lastRemind}-${t.replace(":", "")}`;
        if (readJSON<string>(key, "") === today) continue;
        writeJSON(key, today);
        try {
          new Notification("Track100", {
            body: translate(lang, "remind.body"),
            icon: "/icons/icon-192.png",
          });
        } catch {
          /* ignore */
        }
      }
    };

    check();
    const id = window.setInterval(check, 60000);
    return () => window.clearInterval(id);
  }, [hydrated, enabled, effectiveTimes, lang]);

  return null;
}
