import type { Lang } from "@/lib/i18n";

/**
 * 本地鼓励文案库:不依赖外网接口,离线可用。
 * - 每日一句:按本地日期取模,当天稳定、每天不同。
 * - 点亮一句:按当前点亮格数取模,连续打卡自然换句。
 * - 里程碑 / 目标完成:各有专门文案,不和小鼓励混用。
 */

const DAILY: Record<Lang, readonly string[]> = {
  zh: [
    "今天也从上一个格子开始。",
    "不急,一格一格来。",
    "你正在把日子过成刻度。",
    "今天的一格,留给此刻。",
    "慢慢来,比较快。",
    "昨天已经存好了,今天继续。",
    "让努力有地方落笔。",
    "今天适合重新开始一小步。",
    "进度不赶,方向对就好。",
    "你已经比昨天多了一个选择。",
    "记录本身,就是一种回答。",
    "把今天点亮,就够了。",
    "微小的坚持,也有回声。",
    "先做一格,再看下一步。",
  ],
  en: [
    "One cell at a time, today too.",
    "No rush. Just the next cell.",
    "You're turning days into marks.",
    "Today's cell belongs to this moment.",
    "Slow is steady.",
    "Yesterday is saved. Keep going.",
    "Give your effort somewhere to land.",
    "A small restart fits today.",
    "Not fast, just forward.",
    "You have one more choice than yesterday.",
    "Keeping track is its own answer.",
    "Lighting up today is enough.",
    "Small effort still echoes.",
    "Do one cell, then decide.",
  ],
};

const CHECKIN: Record<Lang, readonly string[]> = {
  zh: [
    "又亮了一格。",
    "稳稳的。",
    "记下了。",
    "继续向前。",
    "这一格是你的。",
    "很好,再来。",
    "逐步靠近。",
    "保持这个节奏。",
    "小小的胜利。",
    "做到了。",
    "今天也有交代。",
    "一步就够。",
  ],
  en: [
    "One more cell lit.",
    "Steady.",
    "Noted.",
    "Keep moving.",
    "That cell is yours.",
    "Good. Again.",
    "Getting closer.",
    "Keep this rhythm.",
    "A small win.",
    "Done.",
    "Today is accounted for.",
    "One step is enough.",
  ],
};

const MILESTONE: Record<Lang, readonly string[]> = {
  zh: ["第 {n} 格,一个值得记住的节点。", "已经走到 {n} 格了。", "{n} 格,继续发光。"],
  en: ["Cell {n}, worth remembering.", "You've reached {n} cells.", "Cell {n}. Still shining."],
};

const COMPLETED: Record<Lang, readonly string[]> = {
  zh: ["「{title}」达成了。", "「{title}」达成,收下这一刻。", "你把它做完了 —— {title}。"],
  en: ["\"{title}\" done.", "Goal reached: {title}. Take this moment.", "You finished {title}."],
};

const DAY_MS = 86400000;

/** 本地日期 → 连续天数序号(与 UTC 无关,避免跨时区当天跳句)。 */
function dayIndex(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

function pick(list: readonly string[], index: number, params: Record<string, string | number> = {}): string {
  const template = list[((index % list.length) + list.length) % list.length];
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? ""));
}

/** 每天打开的那一句:同一天任何时刻调用都相同,跨天自动换。 */
export function getDailyCheer(lang: Lang, date: Date = new Date()): string {
  return pick(DAILY[lang] ?? DAILY.zh, dayIndex(date));
}

export interface CheerContext {
  lang: Lang;
  /** 当前累计点亮格子数,用来让连续打卡自然换句。 */
  litCells: number;
  /** 本次打卡是否跨过整百/整十里程碑。 */
  milestone?: boolean;
  /** 本次打卡是否让目标达成。 */
  completed?: boolean;
  goalTitle?: string;
}

/** 点亮格子时的那一句:完成 > 里程碑 > 普通,优先级明确。 */
export function getCheckinCheer(ctx: CheerContext): string {
  const lang = ctx.lang;
  const n = Number.isFinite(ctx.litCells) ? Math.max(0, Math.floor(ctx.litCells)) : 0;
  if (ctx.completed) {
    return pick(COMPLETED[lang] ?? COMPLETED.zh, n, { title: ctx.goalTitle ?? "" });
  }
  if (ctx.milestone) {
    return pick(MILESTONE[lang] ?? MILESTONE.zh, n, { n });
  }
  return pick(CHECKIN[lang] ?? CHECKIN.zh, n);
}
