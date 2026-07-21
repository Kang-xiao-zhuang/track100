# Information Architecture

Version

1.0

---

# Goal

整个产品遵循：

One Screen

One Purpose

每个页面只负责一件事情。

不要把多个功能塞进一个页面。

---

# Navigation

Track100 采用 Bottom Navigation。

只有三个 Tab。

Home

Statistics

Settings

中间：

Floating Action Button（+）

用于创建 Goal。

--------------------------------

Bottom Navigation

🏠 Home

➕

📊 Stats

⚙️ Settings

--------------------------------

不要超过四个 Tab。

---

# App Flow

Launch

↓

Home

↓

Goal Detail

↓

Back Home

创建：

+

↓

Create Goal

↓

Save

↓

Home

统计：

Bottom Navigation

↓

Statistics

设置：

Bottom Navigation

↓

Settings

---

# Page Structure

Home

├── Header
├── Greeting
├── Search
├── Category Filter
├── Goal List
├── Floating Button
└── Bottom Navigation

---

Goal Detail

├── Header
├── Progress Ring
├── Progress Number
├── Cell Grid
├── Goal Information
├── History
├── Delete
└── Edit

---

Create Goal

├── Header
├── Title
├── Category
├── Target
├── Unit
├── Date
├── Description
└── Save Button

---

Statistics

├── Total Hours
├── Total Goals
├── Completed Goals
├── Current Streak
├── Category Chart
├── Monthly Chart
└── Achievement

---

Settings

├── Theme
├── About
├── Export
├── Import
├── Feedback
└── Version

---

# Home Priority

首页必须遵循：

Progress First

不是：

Task First

进入首页第一眼应该看到：

Today

You've invested

386 Hours

而不是：

今天待办。

这是产品定位。

---

# Goal Card Layout

每一个 Goal Card：

--------------------------------

Progress Ring

Goal Name

Current / Total

Category

Remaining

--------------------------------

例如：

📚

English

72 / 100 Hours

Learning

28 Hours Left

--------------------------------

点击：

进入详情。

长按：

弹出菜单。

---

# Goal Detail Priority

进入详情。

第一屏：

Progress

第二屏：

100 Cells

第三屏：

History

第四屏：

Information

用户打开以后：

不用滑动。

就能直接点击 Cell。

---

# Statistics Priority

Statistics 不展示复杂数据。

第一屏：

Total Progress

第二屏：

Category

第三屏：

Monthly

第四屏：

Achievements

数据必须：

一眼能看懂。

---

# Settings

Settings 保持极简。

不要：

几十个设置。

仅提供：

Theme

Export

Import

About

Feedback

Version

---

# User Journey

第一次使用：

Open App

↓

Create Goal

↓

Tap Cell

↓

See Progress

↓

Close App

整个流程：

30 秒以内完成。

---

# UX Principles

所有操作：

最多两步完成。

例如：

Create Goal

+

↓

Save

完成。

删除：

Goal

↓

Delete

↓

Confirm

完成。

任何功能：

不要超过三步。

---

# Empty State

没有 Goal：

展示：

🌱

Start your first journey.

Create your first goal.

按钮：

Create Goal

不要出现：

空白页面。

---

# Success State

完成 Goal：

动画：

Confetti

文案：

Congratulations!

You completed

English

100 Hours.

按钮：

Share

Back Home

---

# Future

V2：

Cloud Sync

Reminder

Notification

这些不影响 IA。

无需增加页面。