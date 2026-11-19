// Web ↔ Android(Capacitor)差异的唯一出口:组件只调这里,不直接判断平台。
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import {
  isShareBusy,
  isShareCanceled,
  safeFilename,
  type SaveResult,
} from "@/lib/share-file";

export const isNative = () => Capacitor.isNativePlatform();

/** 把异步注册的插件监听包装成同步的取消函数(给 useEffect 的 cleanup 用)。 */
function listen(register: () => Promise<PluginListenerHandle>): () => void {
  if (!isNative()) return () => {};
  const handle = register();
  return () => {
    handle.then((h) => h.remove());
  };
}

/**
 * Android 系统返回键:首页退出 App;其它页面能后退就后退,否则回首页。
 * (没有用户手势的 pushState —— 比如快捷打卡跳进详情页 —— WebView 会认为不能后退。)
 * 返回取消监听函数。
 */
export function handleBackButton(goHome: () => void): () => void {
  return listen(async () => {
    const { App } = await import("@capacitor/app");
    return App.addListener("backButton", ({ canGoBack }) => {
      if (window.location.pathname === "/") App.exitApp();
      else if (canGoBack) window.history.back();
      else goHome();
    });
  });
}

// 本地原生插件,见 android/.../ShortcutsPlugin.java
export interface ShortcutItem {
  id: string;
  shortLabel: string;
  longLabel: string;
  icon: string;
  color: string;
}
interface ShortcutsPlugin {
  set(options: { items: ShortcutItem[] }): Promise<void>;
  addListener(event: "checkin", cb: (data: { goalId: string }) => void): Promise<PluginListenerHandle>;
}
const Shortcuts = registerPlugin<ShortcutsPlugin>("Shortcuts");

/** 更新桌面长按图标出现的快捷打卡列表。 */
export async function setShortcuts(items: ShortcutItem[]): Promise<void> {
  if (isNative()) await Shortcuts.set({ items });
}

/** 监听快捷打卡;App 冷启动时的那次点击也会在注册后送达。返回取消监听函数。 */
export function onShortcutCheckin(cb: (goalId: string) => void): () => void {
  return listen(() => Shortcuts.addListener("checkin", ({ goalId }) => cb(goalId)));
}

function viaFileReader(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result ?? "");
      const comma = raw.indexOf(",");
      resolve(comma >= 0 && raw.startsWith("data:") ? raw.slice(comma + 1) : "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** FileReader 在个别 WebView 上偶发失败/返回空串,降级到 arrayBuffer + btoa。 */
async function blobToBase64(blob: Blob): Promise<string> {
  try {
    const s = await viaFileReader(blob);
    if (s) return s;
  } catch {
    // fall through to the arrayBuffer path
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

interface GallerySaverPlugin {
  saveImage(options: { data: string; filename: string }): Promise<{ uri: string }>;
}
const GallerySaver = registerPlugin<GallerySaverPlugin>("GallerySaver");

/** 保存图片到系统相册:Android 走 MediaStore 插件,Web 端退化为下载。返回是否真正存入相册。 */
export async function saveToGallery(blob: Blob, filename: string): Promise<"saved" | "downloaded"> {
  const name = safeFilename(filename);
  if (!isNative()) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return "downloaded";
  }
  const data = await blobToBase64(blob);
  await GallerySaver.saveImage({ data, filename: name });
  return "saved";
}

export interface SaveFileOptions {
  /** 系统分享面板里的可读标题(EXTRA_SUBJECT),可含中文;文件名本身始终是纯 ASCII。 */
  title?: string;
  /** chooser 标题。 */
  dialogTitle?: string;
}

/**
 * 保存/分享文件:浏览器里触发下载;Android 上写入 cache 后弹系统分享面板。
 * 返回 SaveResult,让调用方区分「成功」与「用户取消」。
 */
export async function saveFile(blob: Blob, filename: string, options: SaveFileOptions = {}): Promise<SaveResult> {
  // 防御性清洗:调用方可能把用户输入的标题拼进文件名,含 / ? # 空格会让原生写入或 MIME 推断失败。
  const name = safeFilename(filename);

  if (isNative()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const data = await blobToBase64(blob);
    if (!data) throw new Error("share.encodeFailed");
    const { uri } = await Filesystem.writeFile({
      path: name,
      data,
      directory: Directory.Cache,
    });
    if (!uri) throw new Error("share.writeFailed");

    // SharePlugin 内部 isPresenting:上一次 chooser 未回调时会直接 reject,退避重试覆盖面板被系统回收的情况。
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await Share.share({
          title: options.title ?? name,
          dialogTitle: options.dialogTitle ?? "Share",
          files: [uri],
        });
        return "shared";
      } catch (err) {
        if (isShareCanceled(err)) return "canceled"; // 用户主动取消,不算失败
        if (isShareBusy(err) && attempt < 2) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }
    throw new Error("share.busy");
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return "downloaded";
}

/** Android:状态栏底色与文字颜色跟随 App 主题(颜色同 globals.css 的 --background)。 */
export async function syncStatusBar(theme: "light" | "dark"): Promise<void> {
  if (!isNative()) return;
  const { StatusBar, Style } = await import("@capacitor/status-bar");
  const dark = theme === "dark";
  await StatusBar.setBackgroundColor({ color: dark ? "#18181B" : "#F8F5EE" });
  await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
}
