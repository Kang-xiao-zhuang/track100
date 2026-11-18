"use client";

import { useSettingsStore } from "@/store/settings.store";
import { accentVars, type AppTheme } from "@/lib/accent";

/**
 * 当前生效主题色的真实颜色值，供 SVG 属性使用。
 *
 * 背景：SVG 的 stroke / stop-color 这类「属性」在部分 Android WebView
 * （尤其 OPPO/ColorOS 旧版）里对 CSS 变量 `rgb(var(--primary))` 解析不完整，
 * 会回退成默认橄榄绿。用 JS 从 store 直接算出真实 rgb 传给属性即可跨端一致。
 * CSS 场景（Tailwind 的 bg-primary 等 class）仍走变量，不受影响。
 */

export interface AccentColors {
  /** "85, 107, 47" —— 可直接拼进 rgb()/rgba()。 */
  rgb: string;
  /** "rgb(85, 107, 47)" —— 可直接作为 SVG 的 stroke/fill/stop-color。 */
  css: string;
}

/** 默认橄榄绿在浅/深主题下的真实值（与 globals.css 的 --primary 保持一致）。 */
const DEFAULT_RGB: Record<AppTheme, string> = {
  light: "85, 107, 47", // #556B2F
  dark: "154, 168, 106", // #9AA86A
};

function resolve(theme: AppTheme, hue: number | null | undefined, sat?: number | null, light?: number | null): string {
  if (hue == null || !Number.isFinite(hue)) return DEFAULT_RGB[theme];
  return accentVars(hue, theme, sat, light).primary.trim().split(/\s+/).join(", ");
}

function make(theme: AppTheme, hue: number | null | undefined, sat: number | null | undefined, light: number | null | undefined): AccentColors {
  const rgb = resolve(theme, hue, sat, light);
  return { rgb, css: `rgb(${rgb})` };
}

/** React 组件里用：订阅主题色字段，改色后自动带着新值重渲染。 */
export function useAccentColors(): AccentColors {
  const theme = useSettingsStore((s) => s.theme);
  const hue = useSettingsStore((s) => s.accentHue);
  const sat = useSettingsStore((s) => s.accentSat);
  const light = useSettingsStore((s) => s.accentLight);
  return make(theme === "dark" ? "dark" : "light", hue, sat, light);
}

/** 非 React 场景（事件回调等）读取当前真实色。 */
export function currentAccentColors(): AccentColors {
  const s = useSettingsStore.getState();
  return make(s.theme === "dark" ? "dark" : "light", s.accentHue, s.accentSat, s.accentLight);
}
