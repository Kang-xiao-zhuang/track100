import { describe, it, expect } from "vitest";
import {
  accentHex,
  accentRingGradient,
  accentVars,
  accentPalette,
  contrastWithWhite,
  hslToHsv,
  hslToRgb,
  hsvToHsl,
  ACCENT_SHADES,
  DEFAULT_ACCENT_HEX,
  DEFAULT_ACCENT_HUE,
} from "../accent";

describe("hslToRgb", () => {
  it("maps primary and secondary hues correctly", () => {
    expect(hslToRgb(0, 1, 0.5)).toEqual({ r: 255, g: 0, b: 0 });
    expect(hslToRgb(1 / 3, 1, 0.5)).toEqual({ r: 0, g: 255, b: 0 });
    expect(hslToRgb(2 / 3, 1, 0.5)).toEqual({ r: 0, g: 0, b: 255 });
  });

  it("returns gray when saturation is zero", () => {
    expect(hslToRgb(0.5, 0, 0.5)).toEqual({ r: 128, g: 128, b: 128 });
  });
});

describe("accentVars", () => {
  it("produces an RGB triplet string for both themes", () => {
    for (const theme of ["light", "dark"] as const) {
      const v = accentVars(210, theme);
      expect(v.primary).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
      expect(v.hover).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
      // each channel within byte range
      for (const part of [...v.primary.split(" "), ...v.hover.split(" ")]) {
        expect(Number(part)).toBeGreaterThanOrEqual(0);
        expect(Number(part)).toBeLessThanOrEqual(255);
      }
    }
  });

  it("dark theme is lighter than light theme for the same hue", () => {
    const light = accentVars(150, "light").primary.split(" ").reduce((a, b) => a + Number(b), 0);
    const dark = accentVars(150, "dark").primary.split(" ").reduce((a, b) => a + Number(b), 0);
    expect(dark).toBeGreaterThan(light);
  });

  it("hover is lighter than primary in both themes", () => {
    for (const theme of ["light", "dark"] as const) {
      const v = accentVars(40, theme);
      const sum = (s: string) => s.split(" ").reduce((a, b) => a + Number(b), 0);
      expect(sum(v.hover)).toBeGreaterThan(sum(v.primary));
    }
  });
});

describe("accentHex / accentRingGradient", () => {
  const varsToHex = (hue: number, theme: "light" | "dark") =>
    `#${accentVars(hue, theme).primary
      .split(" ")
      .map((n) => Number(n).toString(16).padStart(2, "0"))
      .join("")}`;

  it("hex feedback matches the actual --primary value in both themes", () => {
    for (const theme of ["light", "dark"] as const) {
      for (const hue of [0, 82, 210, 359]) {
        expect(accentHex(hue, theme)).toBe(varsToHex(hue, theme));
      }
    }
  });

  it("ring gradient uses the real derived colors, not saturated candy colors", () => {
    for (const theme of ["light", "dark"] as const) {
      const gradient = accentRingGradient(theme);
      expect(gradient).toContain(accentHex(0, theme));
      expect(gradient).toContain(accentHex(180, theme));
      // 0..360 每 5° 一个色标
      expect(gradient.match(/deg/g)).toHaveLength(73);
    }
  });

  it("default hex constants match globals.css", () => {
    expect(DEFAULT_ACCENT_HEX.light).toBe("#556B2F");
    expect(DEFAULT_ACCENT_HEX.dark).toBe("#9AA86A");
  });
});

describe("accentPalette", () => {
  it("uses the original olive palette for the default (null) accent", () => {
    expect(accentPalette(null)).toEqual({ accent: "#556B2F", accentSoft: "#EEF1E6" });
    expect(accentPalette(undefined)).toEqual({ accent: "#556B2F", accentSoft: "#EEF1E6" });
  });

  it("derives valid hex colors for a custom hue", () => {
    const p = accentPalette(210);
    expect(p.accent).toMatch(/^#[0-9a-f]{6}$/);
    expect(p.accentSoft).toMatch(/^#[0-9a-f]{6}$/);
    expect(p.accent).not.toBe(accentPalette(null).accent);
  });

  it("falls back to default for non-finite hues", () => {
    expect(accentPalette(NaN)).toEqual(accentPalette(null));
  });

  it("default hue constant is the olive hue", () => {
    expect(DEFAULT_ACCENT_HUE).toBe(82);
  });
});

describe("HSV/HSL conversion", () => {
  it("round-trips representative colors", () => {
    const samples = [
      [1, 1],
      [0.5, 0.6],
      [0, 0.3],
      [0.8, 0.95],
      [0.42, 0.32],
      [0.3, 0.05],
    ];
    for (const [sv, v] of samples) {
      const hsl = hsvToHsl(sv, v);
      const back = hslToHsv(hsl.s, hsl.l);
      expect(back.s).toBeCloseTo(sv, 5);
      expect(back.v).toBeCloseTo(v, 5);
    }
  });

  it("maps HSV corners correctly", () => {
    expect(hsvToHsl(1, 1)).toEqual({ s: 1, l: 0.5 }); // 纯色
    expect(hsvToHsl(0, 1)).toEqual({ s: 0, l: 1 }); // 白
    expect(hsvToHsl(0, 0)).toEqual({ s: 0, l: 0 }); // 黑
  });
});

describe("custom saturation / lightness", () => {
  const hexToTriple = (hex: string) =>
    hex
      .slice(1)
      .match(/../g)!
      .map((x) => parseInt(x, 16))
      .join(" ");

  it("uses custom s/l instead of the theme defaults", () => {
    expect(accentHex(210, "light", 0.8, 0.6)).not.toBe(accentHex(210, "light"));
    expect(accentVars(210, "light", 0.8, 0.6).primary).toBe(
      hexToTriple(accentHex(210, "light", 0.8, 0.6))
    );
  });

  it("falls back to theme defaults for null/undefined s/l", () => {
    expect(accentHex(210, "light", null, null)).toBe(accentHex(210, "light"));
    expect(accentHex(210, "dark", undefined, undefined)).toBe(accentHex(210, "dark"));
  });

  it("card palette follows custom s/l", () => {
    expect(accentPalette(210, 0.8, 0.6).accent).toBe(accentHex(210, "light", 0.8, 0.6));
  });

  it("shades are ordered from light to dark", () => {
    expect(ACCENT_SHADES).toHaveLength(11);
    for (let i = 1; i < ACCENT_SHADES.length; i++) {
      expect(ACCENT_SHADES[i].l).toBeLessThan(ACCENT_SHADES[i - 1].l);
    }
  });

  it("contrast warning triggers only for very light colors", () => {
    expect(contrastWithWhite("#ffffff")).toBeCloseTo(1, 1);
    expect(contrastWithWhite("#556B2F")).toBeGreaterThan(3);
  });
});
