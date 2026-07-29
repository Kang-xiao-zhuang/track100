"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/store/settings.store";
import { STORAGE_KEYS, readJSON, writeJSON } from "@/lib/storage";
import { translate } from "@/lib/i18n";

/**
 * 注册 Service Worker(使 App 可安装为 PWA)+ 每日提醒。
 * 说明:无后端,提醒在 App/PWA 打开时于设定时间触发一次(前台通知);
 * 真正的后台推送需要服务器(V2)。
 */
export function PwaReminder() {
  const hydrated = useSettingsStore((s) => s.hydrated);
  const enabled = useSettingsStore((s) => s.reminderEnabled);
  const time = useSettingsStore((s) => s.reminderTime);
  const lang = useSettingsStore((s) => s.language);

  // 注册 SW
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // 每日提醒轮询
  useEffect(() => {
    if (!hydrated || !enabled) return;
    if (typeof Notification === "undefined") return;

    const check = () => {
      if (Notification.permission !== "granted") return;
      const now = new Date();
      const [h, m] = time.split(":").map(Number);
      const due = now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
      if (!due) return;
      const today = now.toISOString().slice(0, 10);
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
