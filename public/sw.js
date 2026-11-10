// 极简 Service Worker:让 App 可安装(PWA)+ 离线兜底。
// 缓存名跟随构建版本:注册 URL 为 /sw.js?v=<version>,版本变化会安装新 SW,
// activate 时清掉所有旧版本缓存 —— 避免"发了新版仍看到旧界面"和缓存无限膨胀。
// 注意:原生 Android(Capacitor)不注册 SW,本文件只影响浏览器 / PWA。
const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE = `track100-${VERSION}`;
const CACHE_PREFIX = "track100-";
const STATIC_PATH = "/_next/static/";

self.addEventListener("install", (e) => e.waitUntil(self.skipWaiting()));

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 不碰跨域资源

  // 带 content hash 的静态资源:内容永不变化,放心 cache-first。
  if (url.pathname.startsWith(STATIC_PATH)) {
    e.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        });
      }),
    );
    return;
  }

  // 页面 / manifest / 图标:优先网络,离线时回落缓存。
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || Response.error())),
  );
});
