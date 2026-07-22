import { useSettingsStore } from "@/store/settings.store";

type Dict = Record<string, string>;

const zh: Dict = {
  "nav.home": "首页",
  "nav.stats": "统计",
  "nav.settings": "设置",
  loading: "载入中…",
  all: "全部",
  createGoal: "创建目标",
  save: "保存",
  record: "记录",

  "greet.dawn": "夜深了",
  "greet.morning": "早上好",
  "greet.noon": "中午好",
  "greet.afternoon": "下午好",
  "greet.evening": "晚上好",
  "home.heroPrefix": "你已点亮",
  "home.heroSuffix": "个格子",
  "home.summary": "{goals} 个目标 · 累计打卡 {checkins} 次",
  "empty.title": "开始你的第一段旅程",
  "empty.sub": "创建一个长期目标,把成长变得看得见。",
  "left.remaining": "还差 {n} {unit}",
  "left.done": "已完成 ✓",

  "create.new": "新建目标",
  "create.edit": "编辑目标",
  "f.name": "目标名称",
  "f.namePh": "例如:阅读 100 本书",
  "f.icon": "图标",
  "f.color": "颜色",
  "f.category": "分类",
  "f.target": "目标值",
  "f.unit": "单位",
  "f.step": "每次打卡 +",
  "f.desc": "描述(可选)",
  "f.descPh": "为什么想完成它?",
  "err.name": "请填写目标名称",
  "err.target": "目标值需大于 0",
  "err.step": "步长需大于 0",

  "d.notFound": "目标不存在",
  "d.notFoundSub": "这个目标可能已被删除。",
  "d.checkin": "打卡 +{step} {unit}",
  "d.customPh": "自定义数值",
  "d.history": "打卡记录",
  "d.noRecords": "还没有记录,点上面打卡开始吧。",
  "d.delete": "删除目标",
  "d.confirmDelete": "确定删除「{title}」?此操作不可撤销。",
  "d.doneTag": "已完成 🎉",

  "mode.grid": "格子",
  "mode.ring": "圆环",
  "mode.bar": "进度条",
  "mode.tree": "成长树",
  "mode.heatmap": "热力图",

  "tree.seed": "幼苗",
  "tree.sprout": "抽芽",
  "tree.grow": "成长",
  "tree.strong": "茁壮",
  "tree.forest": "成林",
  "tree.next": "再 {n}% 长成「{label}」",
  "tree.done": "已长成森林 🎉",
  "heat.recent": "最近 {n} 天",
  "heat.less": "少",
  "heat.more": "多",

  "stats.title": "统计",
  "stats.totalGoals": "目标总数",
  "stats.completed": "已完成",
  "stats.streak": "连续打卡",
  "stats.records": "累计打卡",
  "stats.rate": "完成率",
  "stats.catDist": "分类分布",
  "stats.last30": "近 30 天打卡",
  "stats.achievements": "成就",
  "unit.days": "天",

  "set.title": "设置",
  "set.appearance": "外观",
  "set.dark": "深色",
  "set.light": "浅色",
  "set.language": "语言",
  "set.export": "导出数据",
  "set.import": "导入数据",
  "set.about": "关于 Track100",
  "set.aboutSub": "Every hour counts",
  "set.version": "版本",
  "set.footer": "数据仅保存在本机浏览器,记得定期导出备份。",

  "cat.learning": "学习", "cat.health": "健康", "cat.fitness": "健身", "cat.work": "工作",
  "cat.life": "生活", "cat.finance": "理财", "cat.other": "其他",
  "u.hours": "小时", "u.days": "天", "u.books": "本", "u.times": "次", "u.km": "公里", "u.pages": "页", "u.custom": "自定义",

  "b.firstGoal.t": "启程", "b.firstGoal.d": "创建第一个目标",
  "b.firstDone.t": "首次达成", "b.firstDone.d": "完成一个目标",
  "b.streak7.t": "七日之约", "b.streak7.d": "连续打卡 7 天",
  "b.tenGoals.t": "多线并进", "b.tenGoals.d": "同时拥有 10 个目标",
  "b.hundred.t": "百次坚持", "b.hundred.d": "累计打卡 100 次",
};

const en: Dict = {
  "nav.home": "Home",
  "nav.stats": "Stats",
  "nav.settings": "Settings",
  loading: "Loading…",
  all: "All",
  createGoal: "Create Goal",
  save: "Save",
  record: "Add",

  "greet.dawn": "Late night",
  "greet.morning": "Good morning",
  "greet.noon": "Good noon",
  "greet.afternoon": "Good afternoon",
  "greet.evening": "Good evening",
  "home.heroPrefix": "You've lit",
  "home.heroSuffix": "cells",
  "home.summary": "{goals} goals · {checkins} check-ins",
  "empty.title": "Start your first journey",
  "empty.sub": "Create a long-term goal and make growth visible.",
  "left.remaining": "{n} {unit} left",
  "left.done": "Done ✓",

  "create.new": "New Goal",
  "create.edit": "Edit Goal",
  "f.name": "Goal name",
  "f.namePh": "e.g. Read 100 books",
  "f.icon": "Icon",
  "f.color": "Color",
  "f.category": "Category",
  "f.target": "Target",
  "f.unit": "Unit",
  "f.step": "Each check-in +",
  "f.desc": "Description (optional)",
  "f.descPh": "Why do you want it?",
  "err.name": "Please enter a name",
  "err.target": "Target must be > 0",
  "err.step": "Step must be > 0",

  "d.notFound": "Goal not found",
  "d.notFoundSub": "This goal may have been deleted.",
  "d.checkin": "Check in +{step} {unit}",
  "d.customPh": "Custom value",
  "d.history": "History",
  "d.noRecords": "No records yet — tap check-in above to start.",
  "d.delete": "Delete goal",
  "d.confirmDelete": 'Delete "{title}"? This cannot be undone.',
  "d.doneTag": "Completed 🎉",

  "mode.grid": "Grid",
  "mode.ring": "Ring",
  "mode.bar": "Bar",
  "mode.tree": "Tree",
  "mode.heatmap": "Heatmap",

  "tree.seed": "Seed",
  "tree.sprout": "Sprout",
  "tree.grow": "Growing",
  "tree.strong": "Strong",
  "tree.forest": "Forest",
  "tree.next": "{n}% more to reach “{label}”",
  "tree.done": "Grown into a forest 🎉",
  "heat.recent": "Last {n} days",
  "heat.less": "Less",
  "heat.more": "More",

  "stats.title": "Stats",
  "stats.totalGoals": "Goals",
  "stats.completed": "Completed",
  "stats.streak": "Streak",
  "stats.records": "Check-ins",
  "stats.rate": "Completion",
  "stats.catDist": "By category",
  "stats.last30": "Last 30 days",
  "stats.achievements": "Achievements",
  "unit.days": "days",

  "set.title": "Settings",
  "set.appearance": "Appearance",
  "set.dark": "Dark",
  "set.light": "Light",
  "set.language": "Language",
  "set.export": "Export data",
  "set.import": "Import data",
  "set.about": "About Track100",
  "set.aboutSub": "Every hour counts",
  "set.version": "Version",
  "set.footer": "Data lives only in this browser — export a backup regularly.",

  "cat.learning": "Learning", "cat.health": "Health", "cat.fitness": "Fitness", "cat.work": "Work",
  "cat.life": "Life", "cat.finance": "Finance", "cat.other": "Other",
  "u.hours": "hours", "u.days": "days", "u.books": "books", "u.times": "times", "u.km": "km", "u.pages": "pages", "u.custom": "custom",

  "b.firstGoal.t": "Start", "b.firstGoal.d": "Create your first goal",
  "b.firstDone.t": "First win", "b.firstDone.d": "Complete a goal",
  "b.streak7.t": "7-day streak", "b.streak7.d": "Check in 7 days in a row",
  "b.tenGoals.t": "Multitasker", "b.tenGoals.d": "Hold 10 goals at once",
  "b.hundred.t": "Century", "b.hundred.d": "100 check-ins total",
};

const DICTS = { zh, en } as const;

export type Lang = keyof typeof DICTS;
export type TFunc = (key: string, params?: Record<string, string | number>) => string;

export function translate(lang: Lang, key: string, params?: Record<string, string | number>): string {
  let s = DICTS[lang][key] ?? DICTS.zh[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** Hook — re-renders when language changes. */
export function useT(): { t: TFunc; lang: Lang } {
  const lang = useSettingsStore((s) => s.language);
  const t: TFunc = (key, params) => translate(lang, key, params);
  return { t, lang };
}
