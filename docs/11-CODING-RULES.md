# Coding Rules

Version

1.0

---

# Mission

Track100 是一个长期维护项目。

所有代码必须：

Easy to Read

Easy to Maintain

Easy to Extend

不要为了减少代码而降低可读性。

---

# Language

必须：

TypeScript

禁止：

JavaScript

---

# Components

全部：

Function Component

禁止：

Class Component

---

# Type

所有变量：

必须声明类型。

禁止：

any

禁止：

Object

禁止：

unknown

除非确实无法推导。

---

# Props

每个组件：

必须：

interface Props

例如：

interface GoalCardProps {

goal: Goal

onClick: () => void

}

不要：

inline type。

---

# Component Length

一个组件：

不超过

200 行。

超过：

拆组件。

---

# Hooks

业务逻辑：

必须：

Custom Hook

不要：

全部写在页面。

例如：

useGoal()

useStatistics()

useHeatmap()

---

# Folder Rule

禁止：

utils.ts

helper.ts

common.ts

这种万能文件。

所有工具：

必须分类。

例如：

utils/

date.ts

chart.ts

goal.ts

storage.ts

---

# Import

必须：

绝对路径。

例如：

@/components

不要：

../../../

---

# State

Global

↓

Zustand

Local

↓

useState

Server

↓

未来：

React Query

---

# LocalStorage

所有读写：

必须经过：

storage.ts

禁止：

页面直接：

localStorage.setItem()

---

# Styling

Tailwind Only

不要：

CSS

不要：

SCSS

不要：

styled-components

---

# Icons

统一：

Lucide React

不要混用。

---

# Animation

统一：

Framer Motion

不要：

CSS Animation

不要：

GSAP

---

# Forms

统一：

React Hook Form

+

Zod

不要：

自己验证。

---

# Charts

统一：

Recharts

不要：

Chart.js

不要：

ECharts

---

# Naming

Component

PascalCase

GoalCard

Variable

camelCase

goalList

Constant

UPPER_CASE

LOCAL_STORAGE_KEY

---

# File Name

goal-card.tsx

不要：

GoalCard.tsx

统一：

kebab-case

---

# Comments

不要解释：

代码做什么。

解释：

为什么这样设计。

Bad：

// increase count

Good：

// Prevent duplicated progress records

---

# Clean Code

函数：

只做一件事。

不要：

500 行函数。

---

# Error Handling

所有：

try

必须：

catch

不要：

空 catch。

---

# Accessibility

所有按钮：

必须：

aria-label

图片：

alt

输入框：

label

---

# Performance

避免：

重复 render

使用：

memo

useMemo

useCallback

仅在必要时。

不要：

滥用。

---

# Git Commit

统一：

feat:

fix:

refactor:

style:

docs:

test:

chore:

例如：

feat(goal): add grid progress

---

# Pull Request

必须：

通过：

Type Check

Lint

Build