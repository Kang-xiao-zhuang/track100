# State Management

Version

1.0

---

# Principle

Global State

只存：

真正共享的数据。

Local State

放组件内部。

不要：

所有东西都放 Zustand。

---

# Stores

整个项目：

只有四个 Store。

Goal Store

Setting Store

Achievement Store

UI Store

不要继续增加。

---

# Goal Store

负责：

Goal CRUD

Progress

History

Current Goal

Loading

Error

---

State

```ts

goals

selectedGoal

history

loading

error

```

Actions

```ts

createGoal()

updateGoal()

deleteGoal()

increaseProgress()

decreaseProgress()

archiveGoal()

restoreGoal()

```

---

# Settings Store

负责：

Theme

Growth Mode

Language

State

theme

growthMode

language

Actions

toggleTheme()

changeGrowthMode()

changeLanguage()

---

# Achievement Store

负责：

Achievement

Actions

unlock()

checkAchievement()

---

# UI Store

负责：

Modal

Drawer

Toast

Dialog

Current View

Loading

不要：

业务数据。

---

# Component State

例如：

Input

Search

Filter

Dialog

放：

useState()

不要：

放 Zustand。

---

# Data Flow

User

↓

Action

↓

Store

↓

LocalStorage

↓

UI Update

不要：

组件直接操作 LocalStorage。

---

# Rule

组件：

只能调用：

Store。

Store：

负责：

修改数据。

组件：

负责：

展示。

---

# Folder

store/

goal.store.ts

setting.store.ts

achievement.store.ts

ui.store.ts