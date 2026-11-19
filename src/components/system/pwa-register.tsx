"use client";

import { useEffect } from "react";
import { isNative } from "@/lib/native";

/**
 * 注册 Service Worker,使 Web 端可安装为 PWA(原生 App 不需要)。
 * URL 带构建版本:升版本后浏览器会安装新 SW,activate 清掉旧缓存;
 * 已在旧 SW 控制下的页面刷新一次,避免继续用旧版 JS。
 */
export function PwaRegister() {
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

  return null;
}
