/**
 * 分享卡 canvas 的公共设施。
 *
 * Android WebView 上生成大图(1080x1350)有几类偶发问题:字体/emoji 未栅格化就开画、
 * toBlob 返回 null 或干脆不回调、非法颜色让 addColorStop 抛异常、连续分享内存吃紧。
 * 这里统一兜住,业务侧只管画内容。
 */

const BRAND = "#556B2F";

/** 只接受 #RGB / #RRGGBB;3 位展开成 6 位;其它(含导入备份里的脏数据)退回品牌色。 */
export function normalizeHex(input: string | undefined, fallback = BRAND): string {
  const raw = (input ?? "").trim();
  if (/^#[\da-f]{6}$/i.test(raw)) return raw.toLowerCase();
  if (/^#[\da-f]{3}$/i.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toLowerCase();
  }
  return fallback;
}

export function darken(hex: string, f: number): string {
  const h = normalizeHex(hex).slice(1);
  const r = Math.round(parseInt(h.slice(0, 2), 16) * f);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * f);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * f);
  return `rgb(${r},${g},${b})`;
}

/** 等字体就绪再画;带超时,避免个别 WebView 上 fonts.ready 永不 settle 导致分享卡住。 */
export async function waitForFonts(timeoutMs = 1500): Promise<void> {
  const fonts = typeof document === "undefined" ? undefined : document.fonts;
  if (!fonts?.ready) return;
  await Promise.race([
    Promise.resolve(fonts.ready).catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

export interface CardCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export function createCardCanvas(width: number, height: number): CardCanvas {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("card.canvasUnavailable");
  return { canvas, ctx };
}

export interface FitTextOptions {
  size: number;
  minSize?: number;
  weight?: number | string;
  family: string;
}

/** 长标题自动缩小字号,仍放不下则按码点截断加省略号(避免把 emoji 切成半个代理对)。 */
export function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  opts: FitTextOptions,
): string {
  const weight = opts.weight ?? 400;
  const minSize = opts.minSize ?? 28;
  let size = opts.size;
  const setFont = () => {
    ctx.font = `${weight} ${size}px ${opts.family}`;
  };
  setFont();
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 4;
    setFont();
  }
  if (ctx.measureText(text).width <= maxWidth) return text;
  const chars = Array.from(text);
  while (chars.length > 1 && ctx.measureText(chars.join("") + "…").width > maxWidth) {
    chars.pop();
  }
  return chars.join("") + "…";
}

/**
 * toBlob 在部分 Android WebView 上会返回 null 或不回调,超时后降级到同步 toDataURL。
 * 两极都失败才抛错,由 UI 给出明确提示。
 */
export async function canvasToPngBlob(canvas: HTMLCanvasElement, timeoutMs = 4000): Promise<Blob> {
  let blob: Blob | null = null;
  try {
    blob = await Promise.race([
      new Promise<Blob | null>((resolve) => {
        try {
          canvas.toBlob(resolve, "image/png");
        } catch {
          resolve(null);
        }
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
  } catch {
    blob = null;
  }
  if (blob && blob.size > 0) return blob;

  try {
    const url = canvas.toDataURL("image/png");
    const comma = url.indexOf(",");
    if (comma < 0 || !url.startsWith("data:image/png")) throw new Error("bad data url");
    const binary = atob(url.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const fallback = new Blob([bytes], { type: "image/png" });
    if (fallback.size === 0) throw new Error("empty blob");
    return fallback;
  } catch {
    throw new Error("card.encodeFailed");
  }
}

/** 拿到 PNG 后主动释放大位图(约 5.8MB),降低连续分享时 WebView 内存压力。 */
export function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
