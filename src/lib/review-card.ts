import type { YearReview } from "@/utils/review";
import { translate, type Lang } from "@/lib/i18n";
import { accentPalette, type CardPalette } from "@/lib/accent";
import {
  CARD,
  canvasToPngBlob,
  createCardCanvas,
  drawBrandHeader,
  drawFooter,
  drawPaper,
  fitText,
  releaseCanvas,
  roundRect,
  waitForFonts,
} from "@/lib/canvas-card";

/** 年度回顾分享卡:与目标卡共用米白克制风框架。纯 canvas,无外部图片。 */
export async function drawReviewCard(
  r: YearReview,
  lang: Lang = "zh",
  palette?: CardPalette,
): Promise<Blob> {
  await waitForFonts();

  const W = 1080;
  const H = 1350;
  const { canvas: c, ctx } = createCardCanvas(W, H);
  const p = palette ?? accentPalette(null);

  try {
    drawPaper(ctx, W, H);
    drawBrandHeader(ctx, W, `${r.year}.01.01 — ${r.year}.12.31`, p.accent);

    ctx.textAlign = "center";
    // 主标题
    ctx.fillStyle = CARD.ink;
    const title = fitText(ctx, translate(lang, "review.cardTitle", { year: r.year }), W - 200, {
      size: 62,
      minSize: 36,
      weight: 700,
      family: CARD.font,
    });
    ctx.fillText(title, W / 2, 250);

    // 核心数字:点亮格子(品牌色)
    ctx.fillStyle = p.accent;
    ctx.font = `800 200px ${CARD.font}`;
    ctx.fillText(String(r.litCells), W / 2, 490);
    ctx.fillStyle = CARD.muted;
    ctx.font = `500 40px ${CARD.font}`;
    ctx.fillText(translate(lang, "review.cardCells"), W / 2, 556);

    // 三项数据:浅色分隔card,整齐排列
    const rows: [string, string][] = [
      [String(r.checkIns), translate(lang, "review.cardCheckIns")],
      [String(r.activeDays), translate(lang, "review.cardDays")],
      [String(r.longestStreak), translate(lang, "review.cardStreak")],
    ];
    const boxW = 264;
    const boxH = 168;
    const gap = 24;
    const x0 = W / 2 - (boxW * 3 + gap * 2) / 2;
    rows.forEach(([value, label], i) => {
      const bx = x0 + i * (boxW + gap);
      ctx.fillStyle = p.accentSoft;
      roundRect(ctx, bx, 620, boxW, boxH, 20);
      ctx.fill();
      ctx.fillStyle = CARD.ink;
      ctx.font = `700 60px ${CARD.font}`;
      ctx.fillText(value, bx + boxW / 2, 706);
      ctx.fillStyle = CARD.muted;
      ctx.font = `400 26px ${CARD.font}`;
      ctx.fillText(fitText(ctx, label, boxW - 24, { size: 26, minSize: 18, weight: 400, family: CARD.font }), bx + boxW / 2, 756);
    });

    // 全年热力图:取代细格子带,一眼看到这一年的坚持密度
    ctx.fillStyle = CARD.muted;
    ctx.font = `400 26px ${CARD.font}`;
    ctx.fillText(
      fitText(ctx, translate(lang, "review.cardHeat", { days: r.activeDays }), W - 200, {
        size: 26, minSize: 20, weight: 400, family: CARD.font,
      }),
      W / 2,
      880,
    );
    if (r.heat.length > 0) {
      const cell = 14;
      const pitch = 18;
      const lead = new Date(`${r.heat[0].key}T12:00:00`).getDay();
      const padded: ({ key: string; count: number } | null)[] = [
        ...Array.from({ length: lead }, () => null),
        ...r.heat,
      ];
      while (padded.length % 7 !== 0) padded.push(null);
      const cols: ({ key: string; count: number } | null)[][] = [];
      for (let i = 0; i < padded.length; i += 7) cols.push(padded.slice(i, i + 7));
      const gridW = cols.length * pitch - (pitch - cell);
      const x0 = Math.max(60, (W - gridW) / 2);
      const y0 = 910;
      const shownMonths = new Set<number>();
      cols.forEach((col, ci) => {
        col.forEach((day, di) => {
          if (!day) return;
          const month = Number(day.key.slice(5, 7));
          ctx.globalAlpha = day.count === 0 ? 1 : day.count === 1 ? 0.45 : day.count <= 3 ? 0.72 : 1;
          ctx.fillStyle = day.count === 0 ? CARD.cellOff : p.accent;
          roundRect(ctx, x0 + ci * pitch, y0 + di * pitch, cell, cell, 4);
          ctx.fill();
          // 每月第一列上方标月份
          if (di === 0 && !shownMonths.has(month)) {
            shownMonths.add(month);
            ctx.globalAlpha = 1;
            ctx.fillStyle = CARD.muted;
            ctx.font = `400 20px ${CARD.font}`;
            ctx.textAlign = "left";
            ctx.fillText(String(month), x0 + ci * pitch, y0 - 12);
            ctx.textAlign = "center";
          }
        });
      });
      ctx.globalAlpha = 1;
    }

    // 年度结果:浅底胶囊徽章,与三栏数据卡同一套视觉语言,避免孤立黑字
    if (r.completed.length > 0) {
      const label = fitText(
        ctx,
        translate(lang, "review.cardCompleted", { n: r.completed.length }),
        W - 320,
        { size: 32, minSize: 24, weight: 600, family: CARD.font },
      );
      const bw = Math.min(W - 200, ctx.measureText(label).width + 96);
      const bh = 68;
      const bx = (W - bw) / 2;
      const by = 1100;
      ctx.fillStyle = p.accentSoft;
      roundRect(ctx, bx, by, bw, bh, bh / 2);
      ctx.fill();
      ctx.strokeStyle = CARD.line;
      ctx.lineWidth = 2;
      roundRect(ctx, bx, by, bw, bh, bh / 2);
      ctx.stroke();
      ctx.fillStyle = p.accent;
      ctx.textBaseline = "middle";
      ctx.fillText(label, W / 2, by + bh / 2 + 1);
      ctx.textBaseline = "alphabetic";
    }

    drawFooter(ctx, W, H, translate(lang, "review.footer"));
    return await canvasToPngBlob(c);
  } finally {
    releaseCanvas(c);
  }
}
