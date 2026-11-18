"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGoalStore } from "@/store/goal.store";
import { useSettingsStore } from "@/store/settings.store";
import { useCheckinStore } from "@/store/checkin.store";
import { translate } from "@/lib/i18n";
import {
  drainWidgetCheckins,
  handleBackButton,
  isNative,
  notifyCheckinResult,
  onAppResume,
  onNotificationCheckin,
  onShortcutCheckin,
  registerCheckinAction,
  setShortcuts,
  syncWidgetGoals,
} from "@/lib/native";
import { fmt, shortcutGoals } from "@/utils/progress";
import { pickCheckinGoal } from "@/utils/reminder";

/**
 * Android 原生能力接线:系统返回键 + 桌面长按图标的快捷打卡。Web 上什么都不做。
 */
export function NativeBridge() {
  const router = useRouter();
  const hydrated = useGoalStore((s) => s.hydrated);
  const goals = useGoalStore((s) => s.goals);
  const lang = useSettingsStore((s) => s.language);

  useEffect(() => handleBackButton(() => router.replace("/")), [router]);

  // 点了快捷方式:打一次卡并进入该目标详情页(目标已删除则只回首页)
  useEffect(
    () =>
      onShortcutCheckin((goalId) => {
        const store = useGoalStore.getState();
        store.hydrate(); // 冷启动时事件可能先于 AppShell 的 hydrate 到达
        const goal = store.getGoal(goalId);
        if (!goal) return router.push("/");
        store.addProgress(goal.id, goal.step);
        router.push(`/goals?id=${goal.id}`);
      }),
    [router],
  );

  // 通知栏动作定义:每次启动(含语言变化)重新注册,保证按钮文案正确
  useEffect(() => {
    if (!isNative()) return;
    void registerCheckinAction(translate(lang, "notify.action"));
  }, [lang]);

  // 通知栏「打卡 +1」:实时挑一个今天还没打卡的目标,打卡后发确认通知
  useEffect(
    () =>
      onNotificationCheckin(() => {
        const store = useGoalStore.getState();
        store.hydrate(); // 冷启动时事件可能先于 AppShell 的 hydrate 到达
        const goal = pickCheckinGoal(store.goals, store.history);
        if (!goal) {
          void notifyCheckinResult(translate(lang, "notify.allDone"));
          return;
        }
        const recordId = store.addProgress(goal.id, goal.step);
        if (!recordId) return;
        useCheckinStore.getState().show({
          goalId: goal.id,
          recordId,
          value: goal.step,
          unit: goal.unit,
        });
        void notifyCheckinResult(
          translate(lang, "notify.done", {
            title: goal.title,
            n: fmt(goal.step),
            unit: translate(lang, "u." + goal.unit),
          }),
        );
      }),
    [lang],
  );

  // 只有快捷方式内容真的变化时才调原生
  const items = useMemo(
    () =>
      shortcutGoals(goals).map((g) => ({
        id: g.id,
        shortLabel: g.title,
        longLabel: `${g.title} · ${translate(lang, "d.checkin", { step: fmt(g.step), unit: translate(lang, "u." + g.unit) })}`,
        icon: g.icon,
        color: g.color,
      })),
    [goals, lang],
  );
  const itemsKey = JSON.stringify(items);
  useEffect(() => {
    if (!hydrated || !isNative()) return;
    setShortcuts(JSON.parse(itemsKey)).catch(() => {});
  }, [hydrated, itemsKey]);

  // 桌面小组件:目标数据变化时同步(最多 4 个进行中目标),供桌面直接 +1
  const widgetGoals = useMemo(
    () =>
      shortcutGoals(goals).map((g) => ({
        id: g.id,
        title: g.title,
        icon: g.icon,
        step: g.step,
        current: g.current,
        target: g.target,
        color: g.color,
      })),
    [goals],
  );
  const widgetKey = JSON.stringify(widgetGoals);
  useEffect(() => {
    if (!hydrated || !isNative()) return;
    void syncWidgetGoals(JSON.parse(widgetKey));
  }, [hydrated, widgetKey]);

  // 消费小组件上累积的打卡:cold start 和每次回前台都 drain 一次,
  // 用记录里的 ts 作为打卡时间落地,保持与 WebView 数据一致。
  useEffect(() => {
    if (!hydrated || !isNative()) return;
    const drain = () => {
      void drainWidgetCheckins().then((entries) => {
        if (!entries.length) return;
        const store = useGoalStore.getState();
        let first: { goalId: string; recordId: string; value: number; unit: string } | null = null;
        for (const e of entries) {
          if (!store.getGoal(e.goalId)) continue;
          const at = Number.isFinite(e.ts) ? new Date(e.ts).toISOString() : undefined;
          const recordId = store.addProgress(e.goalId, e.value, undefined, at);
          if (recordId && !first) {
            first = {
              goalId: e.goalId,
              recordId,
              value: e.value,
              unit: store.getGoal(e.goalId)?.unit ?? "times",
            };
          }
        }
        if (first) {
          const unit = first.unit as import("@/types/goal").GoalUnit;
          useCheckinStore.getState().show({ ...first, unit });
          void notifyCheckinResult(
            translate(lang, "notify.done", {
              title: store.getGoal(first.goalId)?.title ?? "",
              n: fmt(first.value),
              unit: translate(lang, "u." + unit),
            }),
          );
        }
      });
    };
    drain(); // 冷启动:App 未运行时在桌面点的打卡
    return onAppResume(drain);
  }, [hydrated]);

  return null;
}
