# Design Patterns

Version

1.0

---

# Philosophy

React

Composition

>

Inheritance

---

# Pattern

Container

↓

Presentation

例如：

GoalPage

↓

GoalCard

↓

ProgressView

↓

Cell

页面：

负责数据。

组件：

负责UI。

---

# Smart Component

负责：

Store

API

Data

---

# Dumb Component

负责：

Render

不要：

请求数据。

---

# Single Responsibility

一个组件：

只负责：

一个目的。

---

# Composition

不要：

巨大组件。

应该：

<Card>

<Header/>

<Content/>

<Footer/>

</Card>

---

# Feature Folder

features/

goal/

statistics/

settings/

不要：

所有页面放：

app/

---

# Reuse

ProgressRing

↓

Home

↓

Goal

↓

Statistics

统一复用。

---

# Don't Repeat Yourself

不要复制组件。

如果：

复制第二次。

就抽组件。

---

# Open Close Principle

新增：

Growth Mode

无需修改：

已有组件。

只新增：

一个 Renderer。

---

# Render Strategy

ProgressView

↓

switch(mode)

↓

Grid

↓

Ring

↓

Tree

↓

Heatmap

不要：

多个页面。

---

# Future

以后：

Mountain

Rocket

Galaxy

直接：

新增 Renderer。