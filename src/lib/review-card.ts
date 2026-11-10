import type { YearReview } from "@/utils/review";
import { translate, type Lang } from "@/lib/i18n";

const FONT = "system-ui, 'Microsoft YaHei', sans-serif";

/** 年度回顾分享卡:纯 canvas,无依赖、无外部图片,不会污染画布。 */
export async function drawReviewCard(r: YearReview, lang: Lang = "zh"): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#556B2F");
  bg.addColorStop(1, "#2C3A18");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = `600 34px ${FONT}`;
  ctx.fillText("Track100", W / 2, 110);

  ctx.fillStyle = "#fff";
  ctx.font = `700 62px ${FONT}`;
  ctx.fillText(translate(lang, "review.cardTitle", { year: r.year }), W / 2, 215);

  ctx.font = `800 210px ${FONT}`;
  ctx.fillText(String(r.litCells), W / 2, 440);
  ctx.font = `600 46px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText(translate(lang, "review.cardCells"), W / 2, 510);

  const rows: [string, string][] = [
    [String(r.checkIns), translate(lang, "review.cardCheckIns")],
    [String(r.activeDays), translate(lang, "review.cardDays")],
    [String(r.longestStreak), translate(lang, "review.cardStreak")],
  ];
  ctx.font = `700 52px ${FONT}`;
  ctx.fillStyle = "#fff";
  rows.forEach(([value, label], i) => {
    const x = W / 2 + (i - 1) * 320;
    ctx.fillText(value, x, 640);
    ctx.font = `400 28px ${FONT}`;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(label, x, 685);
    ctx.font = `700 52px ${FONT}`;
    ctx.fillStyle = "#fff";
  });

  // 10x10 格子:超过 100 格时按比例压缩,并注明相当于多少轮
  const rounds = Math.max(1, Math.ceil(r.litCells / 100));
  const lit = Math.min(100, Math.round(r.litCells / rounds));
  const cols = 10;
  const cell = 58;
  const gap = 10;
  const gridW = cols * cell + (cols - 1) * gap;
  const x0 = (W - gridW) / 2;
  const y0 = 760;
  for (let i = 0; i < 100; i++) {
    const cx = x0 + (i % cols) * (cell + gap);
    const cy = y0 + Math.floor(i / cols) * (cell + gap);
    ctx.fillStyle = i < lit ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.18)";
    roundRect(ctx, cx, cy, cell, cell, 12);
    ctx.fill();
  }

  ctx.textAlign = "center";
  ctx.font = `400 32px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  if (rounds > 1) ctx.fillText(translate(lang, "review.cardRounds", { n: rounds }), W / 2, H - 150);
  ctx.fillText(`${translate(lang, "review.completed")} ${r.completed.length}`, W / 2, H - 100);
  ctx.font = `600 36px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText(translate(lang, "review.footer"), W / 2, H - 45);

  return await new Promise<Blob>((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
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
