"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/store/settings.store";
import { STORAGE_KEYS, readJSON, writeJSON } from "@/lib/storage";
import { translate } from "@/lib/i18n";
import { dayKey } from "@/utils/date";
import { cancelDailyReminder, isNative, scheduleDailyReminder } from "@/lib/native";

/**
 * 注册 Service Worker(使 App 可安装为 PWA)+ 每日提醒。
 * 说明:无后端,提醒在 App/PWA 打开时于设定时间触发一次(前台通知);
 * 真正的后台推送需要服务器(V2)。
 * Android(Capacitor)版:改用系统本地通知按天定时,App 关闭也会提醒。
 */
export function PwaReminder() {
  const hydrated = useSettingsStore((s) => s.hydrated);
  const enabled = useSettingsStore((s) => s.reminderEnabled);
  const time = useSettingsStore((s) => s.reminderTime);
  const lang = useSettingsStore((s) => s.language);

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

  // Android:交给系统定时通知
  useEffect(() => {
    if (!hydrated || !isNative()) return;
    (enabled
      ? scheduleDailyReminder(time, translate(lang, "remind.body"), translate(lang, "notify.action"))
      : cancelDailyReminder()
    ).catch(() => {});
  }, [hydrated, enabled, time, lang]);

  // Web:每日提醒轮询
  useEffect(() => {
    if (!hydrated || !enabled || isNative()) return;
    if (typeof Notification === "undefined") return;

    const check = () => {
      if (Notification.permission !== "granted") return;
      const now = new Date();
      const [h, m] = time.split(":").map(Number);
      const due = now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
      if (!due) return;
      const today = dayKey(now);
      if (readJSON<string>(STORAGE_KEYS.lastRemind, "") === today) return; // 今天已提醒
      writeJSON(STORAGE_KEYS.lastRemind, today);
      try {
        new Notification("Track100", {
          body: translate(lang, "remind.body"),
          icon: "/icons/icon-192.png",
        });
      } catch {
        /* ignore */
      }
    };

    check();
    const id = window.setInterval(check, 60000);
    return () => window.clearInterval(id);
  }, [hydrated, enabled, time, lang]);

  return null;
}
