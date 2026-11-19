# Track100 🌱

> Every hour counts.

长期目标可视化 App —— 把庞大的目标（读 100 本书 / 跑 500 公里 / 学 100 小时）拆成一格格，完成就点亮，形成属于自己的人生进度条。

**关注累计投入，而不是今日任务。** 无社交、无排行、无 AI，只有成长。既是网页 App，也能打包成 Android 应用离线使用。

## ✨ 功能

- 🎯 **目标管理**：新建 / 编辑 / 归档 / 删除，自定义图标（50+）、颜色、分类、单位与打卡步长；表单带实时预览，单位用箭头切换、图标条可翻页
- ✅ **打卡**：±步长 / 自定义数值，自动记录历史；首页「今日 +1」与「一键打卡全部」快速记录，打卡带震动反馈
- 🏠 **8 种首页视图**：经典卡片 / 格子带 / 紧凑列表 / 圆点极简 / 点阵打卡 / 大圆方块 / 柱状方块 / 半圆仪表，可在设置里随时切换
- 📅 **年度进度卡**：首页醒目展示「日期 / 今年第几天 / 还剩几天」，自动处理闰年
- 🏆 **15 个成就**：连续打卡、累计次数、完成目标、活跃天数（30 / 100 / 365 天）等，解锁有全屏庆祝卡 + 震动
- 📈 **统计**：累计点亮格数、打卡次数、连续天数、完成率、最活跃目标 Top3、分类分布、近 30 天活跃曲线（跟随主题色）
- 🗓️ **周期回顾**：周报 / 月报 / 年报，各有专属小结与整年打卡热力图；可生成分享长图
- 🎨 **主题色**：HSV 取色器任意选色，全 App 实时生效；深浅色主题
- 💾 **数据安全**：本地存储（localStorage），JSON 备份导出 / 导入；导入前预览差异，支持「合并」与「覆盖恢复（换机用，自动留快照可回滚）」；数据健康面板
- 🌐 **中英双语**：设置里一键切换
- 📱 **Android 原生**：Capacitor 6 打包，支持桌面快捷打卡、文件保存、震动、状态栏

## 🧱 技术栈

Next.js 15（静态导出）· React 19 · TypeScript · TailwindCSS · Zustand · Framer Motion · Recharts · React Hook Form + Zod · Vitest · Playwright · Capacitor 6

## 🚀 本地运行

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # 静态导出到 out/
npm test          # 单元测试
```

本机预览静态产物可用 `node scripts/serve-out.mjs`。

### 打包 Android APK

```bash
npm run android:apk    # build + cap sync + assembleDebug
cd android && ./gradlew.bat assembleRelease   # release 包
```

产物在 `android/app/build/outputs/apk/`，发布包归档于 `release/vX.Y.Z/`。

## 📁 结构

```
docs/     产品文档(PRD / IA / 设计系统 / 数据模型 / 编码规范 / 变更日志 …)
src/
  app/          路由页面(首页 / create / goals/[id] / stats / review / hall / settings)
  components/   layout / goal / progress / common / system
  store/        Zustand(goal / settings)
  lib/          storage / backup / i18n / accent / canvas-card / native / haptics …
  utils/        progress / streak / insights / review / achievements(实时推导,不存冗余)
  types/        Goal / ProgressRecord / Settings
```

详见 `docs/`。架构与编码约定见 `docs/CLAUDE.md`。

## 🗺️ 关于路线

v1.x 聚焦「一个人能用得久」：视觉手感、数据安心、长期正反馈。云同步 / 登录仍是远期计划，当前**完全本地、无后端、无账号**——数据只存在你这台设备上，请定期导出备份。

---

_长期主义。Long-term Progress over Short-term Productivity._
