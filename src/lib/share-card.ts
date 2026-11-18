import type { Goal } from "@/types/goal";
import { cellsLit, fmt, percent } from "@/utils/progress";
import { translate, type Lang } from "@/lib/i18n";
import {
  CARD,
  canvasToPngBlob,
  createCardCanvas,
  drawBrandHeader,
  drawCellBand,
  drawFooter,
  drawPaper,
  fitText,
  normalizeHex,
  releaseCanvas,
  waitForFonts,
} from "@/lib/canvas-card";

/** 米白克制风目标分享卡:统一品牌框架 + 目标色小面积点缀。纯 canvas,返回 PNG blob。 */
export async function drawShareCard(goal: Goal, lang: Lang = "zh"): Promise<Blob> {
  await waitForFonts();

  const W = 1080;
  const H = 1350;
  const { canvas: c, ctx } = createCardCanvas(W, H);
  const color = normalizeHex(goal.color); // 导入备份里的脏色值退回品牌色

  try {
    drawPaper(ctx, W, H);
    const today = new Date();
    const stamp = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
    drawBrandHeader(ctx, W, stamp);

    // 目标 icon:浅色点缀圆底,不再是整块彩色背景
    ctx.fillStyle = CARD.accentSoft;
    ctx.beginPath();
    ctx.arc(W / 2, 300, 88, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "96px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
    ctx.fillText(goal.icon || "🎯", W / 2, 306);
    ctx.textBaseline = "alphabetic";

    // 目标标题(深色);fitText 会设置字号并返回截断后的文本
    ctx.fillStyle = CARD.ink;
    const titleText = fitText(ctx, goal.title, W - 200, { size: 58, minSize: 32, weight: 700, family: CARD.font });
    ctx.fillText(titleText, W / 2, 470);

    // 完成百分比:大字用目标色(浅色目标也够辨识,因为是彩底上的深彩,不是白字)
    ctx.fillStyle = color;
    ctx.font = `800 190px ${CARD.font}`;
    ctx.fillText(`${percent(goal.current, goal.target)}%`, W / 2, 690);

    ctx.fillStyle = CARD.muted;
    ctx.font = `500 40px ${CARD.font}`;
    // 单位翻译失败(导入脏数据)时回退成键名,这里检测并省略,避免卡面出现 "u.words"
    const unitText = translate(lang, "u." + goal.unit);
    const unit = unitText === "u." + goal.unit ? "" : ` ${unitText}`;
    const detail = `${fmt(goal.current)} / ${fmt(goal.target)}${unit}`;
    ctx.fillText(fitText(ctx, detail, W - 200, { size: 40, minSize: 28, weight: 500, family: CARD.font }), W / 2, 756);

    // 细格子带:呼应「点亮格子」意象,点缀色用目标色
    ctx.fillStyle = CARD.muted;
    ctx.font = `400 26px ${CARD.font}`;
    ctx.fillText(translate(lang, "share.cardGrid", { n: cellsLit(goal.current, goal.target) }), W / 2, 858);
    drawCellBand(ctx, cellsLit(goal.current, goal.target), 100, W / 2, 900, W - 260, 20, color);

    drawFooter(ctx, W, H, translate(lang, "review.footer"));
    return await canvasToPngBlob(c);
  } finally {
    releaseCanvas(c);
  }
}
