// Web ↔ Android(Capacitor)差异的唯一出口:组件只调这里,不直接判断平台。
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import {
  isShareBusy,
  isShareCanceled,
  safeFilename,
  type SaveResult,
} from "@/lib/share-file";
import { STORAGE_KEYS, readJSON, writeJSON } from "@/lib/storage";
import {
  MIN_PENDING,
  TEST_NOTIFICATION_ID,
  isScheduleStale,
  nextTriggerSlots,
  reminderIds,
  type ReminderScheduleRecord,
} from "@/lib/reminder-schedule";

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

export const CHECKIN_ACTION_TYPE = "TRACK100_CHECKIN";
export const CHECKIN_ACTION_ID = "quick-checkin";
/** v1.4.1 及更早:单条 cron 定时通知的 id;覆盖安装时一并清掉。 */
const LEGACY_REMINDER_ID = 1;

/**
 * 注册通知栏「打卡 +1」按钮。动作定义存在原生 SharedPreferences,
 * 即使 App 未运行,系统展示通知时也能读到;语言变化时重新注册即可更新按钮文案。
 */
export async function registerCheckinAction(title: string): Promise<void> {
  if (!isNative()) return;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  await LocalNotifications.registerActionTypes({
    types: [{ id: CHECKIN_ACTION_TYPE, actions: [{ id: CHECKIN_ACTION_ID, title }] }],
  });
}

/** 监听通知栏快捷打卡。冷启动时插件会保留事件,直到 JS 侧注册监听后送达。 */
export function onNotificationCheckin(cb: () => void): () => void {
  return listen(async () => {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    return LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
      if (event.actionId === CHECKIN_ACTION_ID) cb();
    });
  });
}

/** 打卡结果用一条即时通知反馈(用户可能没进 App 界面)。id 避开每日提醒的固定区间。 */
export async function notifyCheckinResult(body: string): Promise<void> {
  if (!isNative()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: [{ id: 1_000_000 + Math.floor(Date.now() % 1_000_000), title: "Track100", body }],
    });
  } catch {
    // 通知权限被关闭时静默;打卡本身已经落库
  }
}

// ---- 每日提醒 ------------------------------------------------------------
// 详见 lib/reminder-schedule.ts:一次排好未来 14 天的 at 通知,绕开 cron 重排在
// 「精确闹钟未授权」时退化成 set(RTC) 的问题;App 回前台再补齐。

interface DeviceSettingsPlugin {
  diagnostics(): Promise<{ batteryOptimized: boolean }>;
  openNotificationSettings(): Promise<void>;
  openBatterySettings(): Promise<void>;
}
const DeviceSettings = registerPlugin<DeviceSettingsPlugin>("DeviceSettings");

export interface ReminderStatus {
  ok: boolean;
  reason?: "permission" | "notScheduled" | "error";
  display?: string;
  count?: number;
  nextAt?: string | null;
}

export interface ReminderHealth {
  native: boolean;
  display: string;
  exactAlarm: string;
  batteryOptimized: boolean | null;
  pendingCount: number;
  nextAt: string | null;
  scheduledTime: string | null;
}

/** 所有排程操作串行化:设置页改时间 / App 启动 / 回前台可能同时触发,避免互相 cancel。 */
let reminderQueue: Promise<unknown> = Promise.resolve();
function serializeReminder<T>(fn: () => Promise<T>): Promise<T> {
  const next = reminderQueue.then(fn, fn);
  reminderQueue = next.catch(() => undefined);
  return next;
}

function readSchedule(): ReminderScheduleRecord | null {
  return readJSON<ReminderScheduleRecord | null>(STORAGE_KEYS.reminderSchedule, null);
}

/** 只在需要时弹系统权限框;返回 granted / denied / prompt 等状态。 */
export async function requestNotificationPermission(): Promise<string> {
  if (!isNative()) {
    return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
  }
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  let perm = await LocalNotifications.checkPermissions();
  if (perm.display === "prompt" || perm.display === "prompt-with-rationale") {
    perm = await LocalNotifications.requestPermissions();
  }
  return perm.display;
}

async function doSchedule(time: string, lang: string, body: string, actionTitle: string): Promise<ReminderStatus> {
  const display = await requestNotificationPermission();
  // 关键:权限不通过时绝不先 cancel,否则会把已经排好的闹钟删光且不再排 → 彻底不响
  if (display !== "granted") return { ok: false, reason: "permission", display };

  const { LocalNotifications } = await import("@capacitor/local-notifications");
  await registerCheckinAction(actionTitle);
  const ids = reminderIds();
  const slots = nextTriggerSlots(time, new Date());

  // 顺便清掉 v1.4.1 及更早版本用的 id=1 cron 闹钟,否则覆盖安装后新旧两条提醒会同时响。
  await LocalNotifications.cancel({ notifications: [...ids, LEGACY_REMINDER_ID].map((id) => ({ id })) });
  await LocalNotifications.schedule({
    notifications: slots.map((at, i) => ({
      id: ids[i],
      title: "Track100",
      body,
      schedule: { at, allowWhileIdle: true },
      actionTypeId: CHECKIN_ACTION_TYPE,
      extra: { kind: "daily" },
    })),
  });

  const pending = await LocalNotifications.getPending();
  const mine = pending.notifications.filter((n) => ids.includes(n.id));
  if (mine.length === 0) return { ok: false, reason: "notScheduled", display };
  writeJSON<ReminderScheduleRecord>(STORAGE_KEYS.reminderSchedule, {
    time,
    lang,
    ids,
    scheduledAt: Date.now(),
  });
  return { ok: true, count: mine.length, nextAt: slots[0]?.toISOString() ?? null, display };
}

/** 设置变化 / 手动重排:强制重新排程。 */
export function scheduleDailyReminders(time: string, lang: string, body: string, actionTitle: string): Promise<ReminderStatus> {
  if (!isNative()) return Promise.resolve({ ok: false, reason: "error" });
  return serializeReminder(() => doSchedule(time, lang, body, actionTitle));
}

async function doEnsure(time: string, lang: string, body: string, actionTitle: string): Promise<ReminderStatus> {
  const rec = readSchedule();
  if (isScheduleStale(rec, time, lang)) return doSchedule(time, lang, body, actionTitle);
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const ids = reminderIds();
  try {
    const pending = await LocalNotifications.getPending();
    const mine = pending.notifications.filter((n) => ids.includes(n.id));
    if (mine.length < MIN_PENDING) return doSchedule(time, lang, body, actionTitle); // 被系统清掉或快用完
    return { ok: true, count: mine.length, nextAt: null };
  } catch {
    return doSchedule(time, lang, body, actionTitle);
  }
}

/** App 启动 / 回前台:只在没排上或设置变了时补排,不打扰已排好的闹钟。 */
export function ensureDailyReminders(time: string, lang: string, body: string, actionTitle: string): Promise<ReminderStatus> {
  if (!isNative()) return Promise.resolve({ ok: false, reason: "error" });
  return serializeReminder(() => doEnsure(time, lang, body, actionTitle));
}

export function cancelDailyReminders(): Promise<void> {
  if (!isNative()) return Promise.resolve();
  return serializeReminder(async () => {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [...reminderIds(), LEGACY_REMINDER_ID].map((id) => ({ id })) });
    writeJSON<null>(STORAGE_KEYS.reminderSchedule, null);
  });
}

/** 设置页自检:权限 / 精确闹钟 / 电池优化 / 实际排上的通知与下次触发时间。 */
export async function checkReminderHealth(time?: string): Promise<ReminderHealth> {
  if (!isNative()) {
    return {
      native: false,
      display: typeof Notification === "undefined" ? "unsupported" : Notification.permission,
      exactAlarm: "unsupported",
      batteryOptimized: null,
      pendingCount: 0,
      nextAt: null,
      scheduledTime: null,
    };
  }
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const [perm, exact, pending, power] = await Promise.all([
    LocalNotifications.checkPermissions().catch(() => ({ display: "unknown" })),
    LocalNotifications.checkExactNotificationSetting().catch(() => ({ exact_alarm: "unknown" })),
    LocalNotifications.getPending().catch(() => ({ notifications: [] })),
    DeviceSettings.diagnostics().catch(() => null),
  ]);
  const ids = reminderIds();
  const mine = pending.notifications.filter((n) => ids.includes(n.id));
  const rec = readSchedule();
  const effectiveTime = time ?? rec?.time ?? null;
  // 插件把 at 以 Java Date 塞进 JSONObject,各 ROM 序列化出的字符串不一定能被 JS 解析。
  // 所以「下次提醒」直接由设置推导;getPending 只用来确认闹钟确实排上了。
  const nextAt =
    mine.length > 0 && effectiveTime
      ? (nextTriggerSlots(effectiveTime, new Date())[0]?.toISOString() ?? null)
      : null;
  return {
    native: true,
    display: perm.display,
    exactAlarm: exact.exact_alarm,
    batteryOptimized: power ? power.batteryOptimized : null,
    pendingCount: mine.length,
    nextAt,
    scheduledTime: rec?.time ?? null,
  };
}

/** 立即发一条通知,让用户当场验证权限 / 渠道是否正常。 */
export async function sendTestNotification(body: string): Promise<void> {
  if (!isNative()) {
    if (typeof Notification === "undefined") throw new Error("reminder.permission");
    if (Notification.permission === "default") await Notification.requestPermission();
    if (Notification.permission !== "granted") throw new Error("reminder.permission");
    new Notification("Track100", { body, icon: "/icons/icon-192.png" });
    return;
  }
  const display = await requestNotificationPermission();
  if (display !== "granted") throw new Error("reminder.permission");
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  await LocalNotifications.schedule({
    notifications: [{ id: TEST_NOTIFICATION_ID, title: "Track100", body }],
  });
}

/** 打开系统设置页(各 ROM 可能没有对应 Activity,失败时静默)。 */
export async function openNotificationSettings(): Promise<void> {
  if (isNative()) await DeviceSettings.openNotificationSettings().catch(() => {});
}
export async function openBatterySettings(): Promise<void> {
  if (isNative()) await DeviceSettings.openBatterySettings().catch(() => {});
}
export async function openExactAlarmSettings(): Promise<void> {
  if (!isNative()) return;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  await LocalNotifications.changeExactNotificationSetting().catch(() => {});
}

/** App 从后台回到前台时回调(用于幂等补齐提醒)。返回取消监听函数。 */
export function onAppResume(cb: () => void): () => void {
  return listen(async () => {
    const { App } = await import("@capacitor/app");
    return App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) cb();
    });
  });
}
