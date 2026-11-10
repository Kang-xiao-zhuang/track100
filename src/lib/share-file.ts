/**
 * Android 图片分享链路里的纯函数(不依赖 Capacitor / DOM,便于单测)。
 *
 * 背景:目标标题是用户自由输入,直接拿来做文件名会出现 `/`、`#`、`?`、空格、emoji,
 * 轻则 Share 插件推断不出 image/png,重则 Filesystem.writeFile 把它当子目录而失败。
 * 所以文件名一律转成纯 ASCII;人类可读的标题单独走 Share 的 title(EXTRA_SUBJECT)。
 */

const UNSAFE = /[^a-zA-Z0-9._-]+/g;

/** 生成纯 ASCII、无路径分隔符、扩展名一定在末尾的安全文件名。 */
export function safeFilename(input: string, ext?: string): string {
  const raw = (input ?? "").trim();
  const dot = raw.lastIndexOf(".");
  const inferred = dot > 0 ? raw.slice(dot + 1).toLowerCase() : "";
  const base = dot > 0 ? raw.slice(0, dot) : raw;
  const suffix = (ext ?? (/^[a-z0-9]{1,5}$/.test(inferred) ? inferred : "png"))
    .replace(/^\./, "")
    .toLowerCase();

  const name = base
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(UNSAFE, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48)
    .replace(/_+$/g, "");

  return `${name || "track100-share"}.${suffix || "png"}`;
}

/** Capacitor 插件的错误可能是 Error / string / { message } / { errorMessage }。 */
export function errorMessage(err: unknown): string {
  if (err == null) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  const o = err as { message?: unknown; errorMessage?: unknown; error?: unknown };
  return String(o.message ?? o.errorMessage ?? o.error ?? "");
}

/** 用户主动取消系统分享面板 —— 不算失败,不打扰。 */
export function isShareCanceled(err: unknown): boolean {
  const m = errorMessage(err).toLowerCase();
  return m.includes("share canceled") || m.includes("share cancelled") || m.includes("user canceled");
}

/**
 * Capacitor Share 6 的 SharePlugin 用 isPresenting 串行化分享;
 * 上一次 chooser 结果未回调时,后续调用会全部被拒。可退避重试。
 */
export function isShareBusy(err: unknown): boolean {
  return errorMessage(err).toLowerCase().includes("sharing is in progress");
}

/** 结果供调用方区分「真的分享出去了」和「用户取消」(设置页据此决定是否记录备份时间)。 */
export type SaveResult = "shared" | "downloaded" | "canceled";
