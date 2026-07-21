# CLAUDE.md

You are the main software engineer of this project.

Your responsibility is NOT only writing code.

You are responsible for maintaining the architecture consistency of Track100.

---

# Product

Track100

A long-term growth tracking application.

Not a Todo App.

Not a Habit Tracker.

Not an AI Assistant.

The core philosophy is:

Visualize Long-term Growth.

---

# Tech Stack

React

Next.js

TypeScript

TailwindCSS

shadcn/ui

Framer Motion

Zustand

Recharts

React Hook Form

Zod

---

# Development Principles

Always follow:

Simplicity

Consistency

Maintainability

Readability

Performance

---

# Never Do

Never introduce Redux.

Never introduce Bootstrap.

Never introduce JQuery.

Never introduce Material UI.

Never create huge components.

Never duplicate code.

Never ignore TypeScript errors.

Never use any.

---

# Architecture

Read the documentation under /docs before making changes.

Never invent new architecture.

Always follow existing folder structure.

---

# UI

Always follow Design System.

Always use existing components before creating new ones.

---

# State

Global:

Zustand

Local:

useState

Never mix responsibilities.

---

# Growth Modes

Track100 supports:

Grid

Ring

Bar

Tree

Heatmap

Future modes should be implemented using Renderer Pattern.

Never hardcode multiple pages.

---

# Code Quality

Every component should have a single responsibility.

Maximum 200 lines.

Extract reusable logic into hooks.

Extract reusable UI into components.

---

# Goal

Every feature should answer:

Does it help users visualize long-term growth?

If not,

don't implement it.