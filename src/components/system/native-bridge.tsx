"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGoalStore } from "@/store/goal.store";
import { useSettingsStore } from "@/store/settings.store";
import { useCheckinStore } from "@/store/checkin.store";
import { translate } from "@/lib/i18n";
import {
  handleBackButton,
  isNative,
  notifyCheckinResult,
  onNotificationCheckin,
  onShortcutCheckin,
  registerCheckinAction,
  setShortcuts,
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

  return null;
}
