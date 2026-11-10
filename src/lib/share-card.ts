import type { Goal } from "@/types/goal";
import { cellsLit, fmt, percent } from "@/utils/progress";
import { translate, type Lang } from "@/lib/i18n";
import {
  canvasToPngBlob,
  createCardCanvas,
  darken,
  fitText,
  normalizeHex,
  releaseCanvas,
  roundRect,
  waitForFonts,
} from "@/lib/canvas-card";

const FONT = "system-ui, 'Microsoft YaHei', sans-serif";

/** Pure-canvas share card (no deps, no tainted tiles). Returns a PNG blob. */
export async function drawShareCard(goal: Goal, lang: Lang = "zh"): Promise<Blob> {
  await waitForFonts(); // 首次分享时中文/emoji 可能还没栅格化

  const W = 1080;
  const H = 1350;
  const { canvas: c, ctx } = createCardCanvas(W, H);
  const color = normalizeHex(goal.color); // 导入备份里的脏色值不能让 addColorStop 抛异常

  try {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, color);
    g.addColorStop(1, darken(color, 0.55));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";

    ctx.font = `120px ${FONT}`;
    ctx.fillText(goal.icon || "🎯", W / 2, 210);

    ctx.fillText(
      fitText(ctx, goal.title, W - 120, { size: 60, minSize: 30, weight: 700, family: FONT }),
      W / 2,
      300,
    );

    ctx.font = `800 180px ${FONT}`;
    ctx.fillText(`${percent(goal.current, goal.target)}%`, W / 2, 500);

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    const detail = `${fmt(goal.current)} / ${fmt(goal.target)} ${translate(lang, "u." + goal.unit)}`;
    ctx.fillText(
      fitText(ctx, detail, W - 120, { size: 40, minSize: 26, weight: 400, family: FONT }),
      W / 2,
      570,
    );

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
    ctx.font = `600 40px ${FONT}`;
    ctx.fillText("Track100 · Every hour counts", W / 2, H - 70);

    return await canvasToPngBlob(c);
  } finally {
    releaseCanvas(c);
  }
}
