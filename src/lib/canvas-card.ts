/**
 * 分享卡 canvas 的公共设施。
 *
 * Android WebView 上生成大图(1080x1350)有几类偶发问题:字体/emoji 未栅格化就开画、
 * toBlob 返回 null 或干脆不回调、非法颜色让 addColorStop 抛异常、连续分享内存吃紧。
 * 这里统一兜住,业务侧只管画内容。
 */

const BRAND = "#556B2F";

/** 米白克制风分享卡的共享色板:两张卡严格复用,保证同一套视觉语言。 */
export const CARD = {
  paper: "#FBF9F3",
  ink: "#2A2A26",
  muted: "#8A887E",
  line: "#E8E3D7",
  accent: BRAND,
  accentSoft: "#EEF1E6",
  cellOff: "#E6E2D6",
  font: "system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif",
} as const;

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

/** 米白纸质底 + 细边框内框。两张分享卡共用,构成统一品牌框架。 */
export function drawPaper(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  ctx.fillStyle = CARD.paper;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = CARD.line;
  ctx.lineWidth = 2;
  roundRect(ctx, 36, 36, W - 72, H - 72, 28);
  ctx.stroke();
}

/** 顶部品牌行:左侧小圆点 logo + Track100,右侧日期戳 YYYY.MM.DD。accent 可跟随主题色。 */
export function drawBrandHeader(
  ctx: CanvasRenderingContext2D,
  W: number,
  date: string,
  accent: string = CARD.accent,
): void {
  ctx.textAlign = "left";
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(96, 108, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `600 30px ${CARD.font}`;
  ctx.fillStyle = CARD.ink;
  ctx.fillText("Track100", 118, 119);

  ctx.textAlign = "right";
  ctx.font = `400 26px ${CARD.font}`;
  ctx.fillStyle = CARD.muted;
  ctx.fillText(date, W - 96, 119);
  ctx.textAlign = "center";
}

/** 底部标语行:细分隔线 + 居中 slogan。 */
export function drawFooter(ctx: CanvasRenderingContext2D, W: number, H: number, slogan: string): void {
  ctx.strokeStyle = CARD.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(96, H - 132);
  ctx.lineTo(W - 96, H - 132);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.font = `500 26px ${CARD.font}`;
  ctx.fillStyle = CARD.muted;
  ctx.fillText(slogan, W / 2, H - 84);
}

/** 细格子带:lit 为点亮格数(0..total),cols 控制每行格数,格子自动缩放填满 maxW。 */
export function drawCellBand(
  ctx: CanvasRenderingContext2D,
  lit: number,
  total: number,
  cx: number,
  y: number,
  maxW: number,
  cols: number,
  color: string,
): void {
  const gap = 10;
  const cell = (maxW - gap * (cols - 1)) / cols;
  const bandW = cols * cell + (cols - 1) * gap;
  const x0 = cx - bandW / 2;
  for (let i = 0; i < total; i++) {
    const rx = x0 + (i % cols) * (cell + gap);
    const ry = y + Math.floor(i / cols) * (cell + gap);
    ctx.fillStyle = i < lit ? color : CARD.cellOff;
    roundRect(ctx, rx, ry, cell, cell, Math.min(8, cell / 3));
    ctx.fill();
  }
}
