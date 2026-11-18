import type { PeriodReview, ReviewPeriod } from "@/utils/period-review";

/**
 * 周期回顾小结：把 PeriodReview 的数据翻译成「属于这个周期」的总结。
 *
 * 三个周期各有侧重，避免切来切去都是同一套「这一年」的口吻：
 *  - 周报：聚焦本周节奏 —— 活跃天数、最活跃的星期、是否天天坚持
 *  - 月报：聚焦月度积累 —— 打卡次数、点亮格子、最专注目标
 *  - 年报：聚焦年度成就 —— 点亮格子、完成目标、最专注领域
 *
 * 返回结构只有 i18n key + 参数，文案交给 t() 渲染，保持纯函数可测。
 */
export interface SummaryLine {
  /** 主小结句 i18n key */
  key: string;
  params?: Record<string, string | number>;
  /** 可选的补充句（第二个亮点），没有则 undefined */
  extraKey?: string;
  extraParams?: Record<string, string | number>;
}

/** 数据不足时的兜底小结。 */
function emptySummary(period: ReviewPeriod): SummaryLine {
  return { key: `review.summary.${period}.empty` };
}

export function periodSummary(r: PeriodReview): SummaryLine {
  if (r.checkIns === 0) return emptySummary(r.period);

  if (r.period === "week") {
    // 一周只有 7 天，用「几天有打卡 + 最活跃星期」讲清节奏。
    const perfect = r.activeDays >= 7;
    const best = r.bestBucket?.label || "";
    return {
      key: perfect ? "review.summary.week.perfect" : "review.summary.week.main",
      params: { n: r.checkIns, days: r.activeDays, streak: r.longestStreak },
      extraKey: best ? "review.summary.week.best" : undefined,
      extraParams: best ? { day: best, n: r.bestBucket!.count } : undefined,
    };
  }

  if (r.period === "month") {
    // 一个月 28~31 天，突出累计与连击，再补最专注目标。
    const top = r.goalRanks[0]?.goal.title ?? "";
    return {
      key: "review.summary.month.main",
      params: { n: r.checkIns, cells: r.litCells, days: r.activeDays, streak: r.longestStreak },
      extraKey: top ? "review.summary.month.top" : undefined,
      extraParams: top ? { goal: top, n: r.goalRanks[0].checkIns } : undefined,
    };
  }

  // 年报：点亮格子 + 打卡次数 + 完成目标，再补最专注领域。
  const cat = r.topCategory ? r.topCategory.category : "";
  return {
    key: "review.summary.year.main",
    params: { cells: r.litCells, n: r.checkIns, days: r.activeDays, done: r.completed.length },
    extraKey: cat ? "review.summary.year.cat" : undefined,
    // catLabel 由 UI 层用 t("cat."+category) 翻译后填入，这里给原始 category 供查找。
    extraParams: cat ? { category: cat, n: r.topCategory!.count } : undefined,
  };
}
