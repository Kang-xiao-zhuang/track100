# Component Specification

Version

1.0

---

# Design Principle

所有组件：

Single Responsibility。

一个组件：

只负责一件事情。

---

# Layout

AppLayout

负责：

整体布局。

包含：

Header

Content

Bottom Navigation

---

# Header

Props

title

subtitle

actions

返回：

ReactNode

---

# Goal Card

Props

Goal

onClick

onEdit

onDelete

负责：

展示：

一个目标。

不要负责：

修改数据。

---

# Progress View

这是整个项目核心。

统一接口：

ProgressView

Props

progress

total

viewType

--------------------------------

viewType

grid

ring

bar

tree

heatmap

--------------------------------

Claude 必须根据：

viewType

自动渲染。

而不是：

多个页面。

---

# Grid View

负责：

100 Cells。

Props

current

total

editable

onChange

---

# Ring View

负责：

圆环。

Props：

progress

animation

---

# Bar View

负责：

Progress Bar。

支持：

动画。

---

# Tree View

负责：

成长树。

阶段：

Seed

Sprout

Young

Tree

Forest

根据：

百分比

切换。

---

# Heatmap View

负责：

GitHub 风格。

Props

history

days

weeks

---

# View Switch

Props

currentView

onChange

负责：

切换：

Grid

Ring

Bar

Tree

Heatmap

---

# Statistics Card

Props

title

value

icon

trend

---

# Floating Button

Props

onClick

固定：

右下角。

---

# Category Chip

Props

name

selected

color

onClick

---

# Progress Ring

独立组件。

以后：

Home

Statistics

都能复用。

---

# Chart

统一：

Recharts。

不要：

多个图表库。

---

# Modal

统一：

Dialog。

使用：

shadcn。

不要：

自己写。

---

# Toast

统一：

Sonner。

不要：

Alert。

---

# Folder

components

├── common

├── goal

├── progress

├── charts

├── layout

├── ui

Claude 必须遵守。