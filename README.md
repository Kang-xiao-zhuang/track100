# Track100 🌱

> Every hour counts.

长期目标可视化 Web App —— 把庞大的目标(读 100 本书 / 跑 500 公里 / 学 100 小时)拆成一格格,完成就点亮,形成属于自己的人生进度条。

**关注累计投入,而不是今日任务。** 无社交、无排行、无 AI,只有成长。

## ✨ 功能(v1.0)

- 🎯 目标管理:创建 / 编辑 / 删除,自定义图标 / 颜色 / 分类 / 单位 / **打卡步长**
- ✅ 打卡:±步长 / 自定义数值,自动记录历史
- 📊 进度视图(同一份数据,三种呈现):**Grid(100 格,每格 1%)/ Ring / Bar**
- 🏠 首页 Progress-First:「你已点亮 N 个格子」+ 分类筛选 + 目标卡
- 📈 统计:目标 / 完成 / 连续打卡 / 完成率 + 分类分布 + 近 30 天打卡
- ⚙️ 设置:深浅色、数据导出 / 导入(JSON 备份)
- 💾 本地存储(localStorage),无后端

## 🧱 技术栈

Next.js 15 · React 19 · TypeScript · TailwindCSS · Zustand · Framer Motion · Recharts · React Hook Form + Zod

## 🚀 本地运行

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
```

## 📁 结构

```
docs/     产品文档(PRD / IA / 设计系统 / 架构 / 编码规范 …)
src/
  app/          路由页面(首页 / create / goals/[id] / stats / settings)
  components/   layout / goal / progress
  store/        Zustand(goal / settings)
  lib/          storage / meta / cn / id
  utils/        progress / stats(实时推导,不存冗余)
  types/        Goal / ProgressRecord / Settings
```

详见 `docs/`。架构一致性要求见 `docs/CLAUDE.md`。

## 🗺️ Roadmap

- **v1.1**:Tree / Heatmap 成长视图 · 成就徽章 · 分享卡 · Confetti · 中英双语
- **v1.2**:提醒 · PWA
- **v2.0**:云同步(Supabase)· 登录

---

_长期主义。Long-term Progress over Short-term Productivity._
