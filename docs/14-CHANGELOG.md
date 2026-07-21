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

## v1.1.0 (Planned)

- Tree / Heatmap 成长视图(新增 Renderer,不改数据)
- 成就徽章(First Goal / 100% / 10 Goals / 100 Records)
- 分享卡片 + 完成时 Confetti 动画
- 中英双语
- shadcn/ui 组件层

---

## v1.2.0 (Planned)

- Reminder
- PWA

---

## v2.0 (Planned)

- Cloud Sync(Supabase)
- Login
- Notification
