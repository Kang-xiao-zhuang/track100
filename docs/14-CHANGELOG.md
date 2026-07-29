# Changelog

## v1.0.0 — 2026-07-21 (Shipped)

首个可用版本,核心闭环 Plan → Track → Record → Analyze 全部跑通。

**已实现**

- 目标管理:创建 / 编辑 / 删除(React Hook Form + Zod 校验)
- 打卡:自定义步长 +/−、自定义数值记录,自动生成 ProgressRecord 历史
- 进度视图(Renderer 策略,同一份数据):Grid(恒 100 格 = 每格 1%)/ Ring / Bar
- 首页:Progress-First 展示「已点亮格子数 + 累计打卡」、分类筛选、目标卡、空状态、FAB
- 统计:目标数 / 已完成 / 连续打卡 / 累计打卡 / 完成率 + 分类分布图 + 近 30 天打卡图(Recharts)
- 设置:深 / 浅色切换、数据导出 / 导入(JSON 备份)、关于 / 版本
- 本地存储:localStorage(经 storage.ts 统一读写),统计一律实时推导、无冗余
- 视觉:暖色设计系统 + 深色模式、Framer Motion 过渡

**技术栈**:Next.js 15 · React 19 · TypeScript · TailwindCSS · Zustand · Framer Motion · Recharts · RHF + Zod

**关键设计决策**

- 网格恒定 100 格,每格 = 目标的 1% → 任意单位(小时/公里/本)统一到「100 格」
- 打卡采用自定义步长,保证 3 秒完成

---

## v1.1.0 — 2026-07-22 (Shipped)

- Tree / Heatmap 成长视图(新增 Renderer,零改数据层 —— 验证策略模式)
- 完成时 Confetti 撒花(纯 Framer Motion)
- 成就徽章(启程 / 首次达成 / 七日之约 / 多线并进 / 百次坚持,数据实时推导)
- 分享卡(纯 canvas PNG,含点亮格子,随语言)
- 中英双语 i18n(设置里一键切换,词典 + useT 钩子 + {参数} 插值)

**未做(移至后续)**:shadcn/ui 组件层

---

## v1.2.0 — 2026-07-29 (Shipped)

- 预计完成 / 配速:按打卡历史 + 截止日推算完成日,显示领先/落后天数(纯推导)
- 建目标新增可选「截止日期」(endDate)
- 里程碑庆祝:25/50/75/100% 跨越时撒花
- 备份提醒:记录上次导出时间,>14 天或从未备份时首页提醒
- 每日提醒 + PWA:manifest + Service Worker(可安装到桌面/主屏)、设置里开关 + 时间;通知在 App 打开时于设定时间触发

> 限制:无后端,提醒为前台/打开时触发;真正的后台推送留待 V2(云同步)。

---

## v2.0 (Planned)

- Cloud Sync(Supabase)
- Login
- Notification
