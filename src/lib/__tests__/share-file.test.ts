import { describe, expect, it } from "vitest";
import { errorMessage, isShareBusy, isShareCanceled, safeFilename } from "@/lib/share-file";

const SAFE_NAME = /^[a-zA-Z0-9._-]+$/;

describe("safeFilename", () => {
  it("保留已是安全名的输入与推断出的扩展名", () => {
    expect(safeFilename("track100-goal-abc123.png")).toBe("track100-goal-abc123.png");
    expect(safeFilename("track100-backup-2026-11-10.json")).toBe("track100-backup-2026-11-10.json");
  });

  it("去掉目标标题里的路径分隔符(否则原生写入会被当成子目录)", () => {
    const n = safeFilename("track100-读书/跑步 100 本 🌱.png");
    expect(n.endsWith(".png")).toBe(true);
    expect(n.slice(0, -4)).toMatch(SAFE_NAME);
    expect(n).not.toContain("/");
    expect(n).not.toContain(" ");
  });

  it("# ? 等会破坏 file URI 的字符也被替换", () => {
    const n = safeFilename("我的#目标?.png");
    expect(n).toMatch(/^[a-zA-Z0-9._-]+\.png$/);
  });

  it("空输入或全非法字符有兜底名", () => {
    expect(safeFilename("")).toBe("track100-share.png");
    expect(safeFilename("🌱🌱🌱.png")).toBe("track100-share.png");
  });

  it("可强制指定扩展名,且长名被截断后扩展名仍在末尾", () => {
    expect(safeFilename("anything", "json")).toBe("anything.json");
    const n = safeFilename("a".repeat(200) + ".png");
    expect(n.length).toBeLessThan(60);
    expect(n.endsWith(".png")).toBe(true);
    expect(n.slice(0, -4)).toMatch(SAFE_NAME);
  });
});

describe("原生分享错误分类", () => {
  it("兼容 Error / string / 插件返回的 errorMessage 结构", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage("plain")).toBe("plain");
    expect(errorMessage({ errorMessage: "FILE_NOTCREATED" })).toBe("FILE_NOTCREATED");
    expect(errorMessage(null)).toBe("");
  });

  it("用户取消分享不算失败", () => {
    expect(isShareCanceled(new Error("Share canceled"))).toBe(true);
    expect(isShareCanceled(new Error("Share cancelled"))).toBe(true);
    expect(isShareCanceled(new Error("FILE_NOTCREATED"))).toBe(false);
  });

  it("识别 SharePlugin 的 isPresenting 串行锁报错", () => {
    const busy = "Can't share while sharing is in progress";
    expect(isShareBusy(busy)).toBe(true);
    expect(isShareCanceled(busy)).toBe(false);
  });
});
