// Web ↔ Android(Capacitor)差异的唯一出口:组件只调这里,不直接判断平台。
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

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

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** 保存文件:浏览器里触发下载;Android 上写入缓存后弹出系统分享面板(可存到文件/发微信等)。 */
export async function saveFile(blob: Blob, filename: string): Promise<void> {
  if (isNative()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const { uri } = await Filesystem.writeFile({
      path: filename,
      data: await blobToBase64(blob),
      directory: Directory.Cache,
    });
    await Share.share({ title: filename, files: [uri] });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Android:状态栏底色与文字颜色跟随 App 主题(颜色同 globals.css 的 --background)。 */
export async function syncStatusBar(theme: "light" | "dark"): Promise<void> {
  if (!isNative()) return;
  const { StatusBar, Style } = await import("@capacitor/status-bar");
  const dark = theme === "dark";
  await StatusBar.setBackgroundColor({ color: dark ? "#18181B" : "#F8F5EE" });
  await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
}

const REMINDER_ID = 1;

/** Android:用系统本地通知每天定时提醒(App 关闭也会触发)。返回是否获得通知权限。 */
export async function scheduleDailyReminder(time: string, body: string): Promise<boolean> {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  let perm = await LocalNotifications.checkPermissions();
  if (perm.display === "prompt" || perm.display === "prompt-with-rationale") {
    perm = await LocalNotifications.requestPermissions();
  }
  await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
  if (perm.display !== "granted") return false;
  const [hour, minute] = time.split(":").map(Number);
  await LocalNotifications.schedule({
    notifications: [
      { id: REMINDER_ID, title: "Track100", body, schedule: { on: { hour, minute }, allowWhileIdle: true } },
    ],
  });
  return true;
}

export async function cancelDailyReminder(): Promise<void> {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
}
