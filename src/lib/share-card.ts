import type { Goal } from "@/types/goal";
import { cellsLit, fmt, percent } from "@/utils/progress";
import { translate, type Lang } from "@/lib/i18n";

function darken(hex: string, f: number): string {
  const h = hex.replace("#", "");
  const r = Math.round(parseInt(h.slice(0, 2), 16) * f);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * f);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * f);
  return `rgb(${r},${g},${b})`;
}

/** Pure-canvas share card (no deps, no tainted tiles). Returns a PNG blob. */
export async function drawShareCard(goal: Goal, lang: Lang = "zh"): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;

  // background gradient from the goal's color
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, goal.color);
  g.addColorStop(1, darken(goal.color, 0.55));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";

  ctx.font = "120px system-ui, sans-serif";
  ctx.fillText(goal.icon, W / 2, 210);

  ctx.font = "700 60px system-ui, 'Microsoft YaHei', sans-serif";
  ctx.fillText(goal.title, W / 2, 300);

  const p = percent(goal.current, goal.target);
  ctx.font = "800 180px system-ui, sans-serif";
  ctx.fillText(`${p}%`, W / 2, 500);

  ctx.font = "400 40px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText(`${fmt(goal.current)} / ${fmt(goal.target)} ${translate(lang, "u." + goal.unit)}`, W / 2, 570);

  // 10x10 lit grid — the brand
  const lit = cellsLit(goal.current, goal.target);
  const cols = 10;
  const cell = 72;
  const gap = 12;
  const gridW = cols * cell + (cols - 1) * gap;
  const x0 = (W - gridW) / 2;
  const y0 = 660;
  for (let i = 0; i < 100; i++) {
    const cx = x0 + (i % cols) * (cell + gap);
    const cy = y0 + Math.floor(i / cols) * (cell + gap);
    ctx.fillStyle = i < lit ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.2)";
    roundRect(ctx, cx, cy, cell, cell, 14);
    ctx.fill();
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "600 40px system-ui, sans-serif";
  ctx.fillText("Track100 · Every hour counts", W / 2, H - 70);

  return await new Promise<Blob>((res) => c.toBlob((b) => res(b!), "image/png"));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
