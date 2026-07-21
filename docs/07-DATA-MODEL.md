# docs/07-DATA-MODEL.md

# Data Model

Version

1.0

---

# Goal

整个项目采用：

TypeScript

所有数据必须有类型。

禁止：

any

禁止：

Object

所有字段必须有明确意义。

---

# Core Entity

整个项目只有一个核心实体：

Goal

所有统计都由 Goal 推导。

不要建立重复数据。

---

# Goal

```ts
export interface Goal {

    id: string

    title: string

    description?: string

    icon: string

    color: string

    category: GoalCategory

    unit: GoalUnit

    target: number

    current: number

    createdAt: string

    updatedAt: string

    startDate?: string

    endDate?: string

    archived: boolean

}
```

---

# GoalCategory

```ts
export type GoalCategory =

| "learning"

| "health"

| "work"

| "life"

| "finance"

| "fitness"

| "other"
```

---

# GoalUnit

```ts
export type GoalUnit =

| "hours"

| "days"

| "books"

| "times"

| "km"

| "pages"

| "custom"
```

---

# Progress History

为了支持：

Heatmap

History

Statistics

未来需要记录每一次变化。

```ts
export interface ProgressRecord {

    id: string

    goalId: string

    value: number

    note?: string

    createdAt: string

}
```

例如：

今天：

英语

+1 Hour

↓

生成：

ProgressRecord

不要直接修改统计。

统计永远根据 History 计算。

---

# View Mode

用户喜欢的成长方式。

```ts

export type GrowthMode =

| "grid"

| "ring"

| "bar"

| "tree"

| "heatmap"

```

以后新增：

Mountain

Rocket

Galaxy

无需修改数据库。

---

# Settings

```ts

export interface Settings {

theme:

"light"

|

"dark"

growthMode:

GrowthMode

language:

"zh"

|

"en"

}

```

---

# Achievement

```ts

export interface Achievement {

id: string

title: string

description: string

icon: string

completed: boolean

completedAt?: string

}

```

V1：

只需要：

First Goal

100%

10 Goals

100 Records

即可。

---

# Statistics

不要存储。

例如：

Total Hours

↓

根据：

Goal.current

实时计算。

Category Count

↓

根据：

Goal.category

计算。

永远不要：

保存重复统计。

---

# LocalStorage

保存：

Goals

Progress History

Settings

Achievements

不要：

保存缓存统计。

---

# LocalStorage Keys

track100-goals

track100-history

track100-settings

track100-achievements

---

# Future

V2：

Supabase

数据库结构保持一致。

无需修改 Types。