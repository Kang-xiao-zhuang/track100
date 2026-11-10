import { describe, expect, it, vi } from "vitest";
import {
  canvasToPngBlob,
  darken,
  fitText,
  normalizeHex,
  releaseCanvas,
  waitForFonts,
} from "@/lib/canvas-card";

function mockCtx(): CanvasRenderingContext2D {
  const c = {
    font: "",
    measureText(text: string) {
      const m = /(\d+(?:\.\d+)?)px/.exec(c.font);
      const px = m ? Number(m[1]) : 16;
      return { width: Array.from(text).length * px * 0.6 };
    },
  };
  return c as unknown as CanvasRenderingContext2D;
}

function mockCanvas(opts: { blob?: Blob | null; never?: boolean; dataUrl?: string } = {}): HTMLCanvasElement {
  const c = {
    toBlob(cb: (b: Blob | null) => void) {
      if (opts.never) return;
      cb(opts.blob === undefined ? new Blob(["png"], { type: "image/png" }) : opts.blob);
    },
    toDataURL: () => opts.dataUrl ?? `data:image/png;base64,${btoa("png-bytes")}`,
  };
  return c as unknown as HTMLCanvasElement;
}

describe("颜色容错", () => {
  it("合法 6 位/3 位 hex 正常处理", () => {
    expect(normalizeHex("#AABBCC")).toBe("#aabbcc");
    expect(normalizeHex("#abc")).toBe("#aabbcc");
  });

  it("导入备份里的脏色值退回品牌色,不会让 addColorStop 抛异常", () => {
    expect(normalizeHex("not-a-color")).toBe("#556B2F");
    expect(normalizeHex(undefined)).toBe("#556B2F");
    expect(darken("not-a-color", 0.5)).toBe("rgb(43,54,24)");
  });
});

describe("fitText", () => {
  const family = "sans-serif";

  it("短文本原样返回", () => {
    const ctx = mockCtx();
    expect(fitText(ctx, "读书", 960, { size: 60, family })).toBe("读书");
    expect(ctx.font).toContain("60px");
  });

  it("中等长度文本靠缩小字号避免溢出", () => {
    const ctx = mockCtx();
    const out = fitText(ctx, "目".repeat(20), 400, { size: 60, minSize: 30, family });
    expect(out).toBe("目".repeat(20));
    const px = Number(/(\d+)px/.exec(ctx.font)![1]);
    expect(px).toBeLessThan(60);
    expect(px).toBeGreaterThanOrEqual(30);
    expect(ctx.measureText(out).width).toBeLessThanOrEqual(400);
  });

  it("超长文本按码点截断,不产生半个 emoji 代理对", () => {
    const ctx = mockCtx();
    const out = fitText(ctx, "🌱".repeat(200), 400, { size: 60, minSize: 30, family });
    expect(out.endsWith("…")).toBe(true);
    expect(Array.from(out).length).toBeLessThan(200);
    expect(out.includes("\uFFFD")).toBe(false);
  });
});

describe("canvasToPngBlob", () => {
  it("toBlob 正常时直接返回", async () => {
    const b = await canvasToPngBlob(mockCanvas());
    expect(b.type).toBe("image/png");
    expect(b.size).toBeGreaterThan(0);
  });

  it("toBlob 返回 null 时降级到 toDataURL", async () => {
    const b = await canvasToPngBlob(mockCanvas({ blob: null }));
    expect(b.type).toBe("image/png");
    expect(b.size).toBe(9);
  });

  it("toBlob 不回调时超时降级,不会让分享卡永远卡住", async () => {
    const b = await canvasToPngBlob(mockCanvas({ never: true }), 20);
    expect(b.size).toBe(9);
  });

  it("两条编码路径都失败才抛出明确错误", async () => {
    await expect(
      canvasToPngBlob(mockCanvas({ blob: null, dataUrl: "not-a-data-url" }), 20),
    ).rejects.toThrow("card.encodeFailed");
  });
});

describe("资源释放与字体等待", () => {
  it("releaseCanvas 把大位图尺寸归零", () => {
    const c = { width: 1080, height: 1350 } as HTMLCanvasElement;
    releaseCanvas(c);
    expect(c.width).toBe(0);
    expect(c.height).toBe(0);
  });

  it("无 fonts API 时立即返回", async () => {
    await expect(waitForFonts(10)).resolves.toBeUndefined();
  });

  it("fonts.ready 永不 settle 时有超时保护", async () => {
    vi.stubGlobal("document", { fonts: { ready: new Promise<void>(() => {}) } });
    try {
      const start = Date.now();
      await waitForFonts(20);
      expect(Date.now() - start).toBeLessThan(1000);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
