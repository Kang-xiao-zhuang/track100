import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

/**
 * 核心链路冒烟:创建目标 → 快捷打卡 → 导出备份 → 合并导入。
 * 断言以默认中文界面为准;每个用例使用独立 browser context,localStorage 天然干净。
 */
test("创建目标 → 打卡 → 导出备份 → 合并导入", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept()); // 导入成功后的提示

  // 1. 首页进入新建
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "开始你的第一段旅程" })).toBeVisible();
  await page.getByRole("link", { name: "创建目标" }).first().click();
  await expect(page).toHaveURL(/\/create/);

  // 2. 只填必填的标题,其余字段用默认值,提交后回到首页
  await page.locator('input[name="title"]').fill("E2E 读书计划");
  await page.getByRole("button", { name: "创建目标" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "E2E 读书计划" })).toBeVisible();

  // 3. 首页快捷 +1,等延迟落盘完成后确认记录已写出
  await page.getByRole("button", { name: /快捷打卡/ }).click();
  await expect(page.getByText(/已打卡/)).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("track100-history") ?? "[]").length))
    .toBeGreaterThan(0);

  // 4. 导出备份并校验文件内容
  await page.goto("/settings");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /导出数据/ }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  const backup = JSON.parse(await readFile(path!, "utf8"));
  expect(backup.app).toBe("track100");
  expect(backup.goals).toHaveLength(1);
  expect(backup.goals[0].title).toBe("E2E 读书计划");
  expect(backup.history.length).toBeGreaterThan(0);

  // 5. 导入同一份文件:按 id 合并,不应产生重复记录或覆盖已有数据
  await page.locator('input[type="file"]').setInputFiles(path!);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "E2E 读书计划" })).toBeVisible();
  const historyLen = await page.evaluate(
    () => JSON.parse(localStorage.getItem("track100-history") ?? "[]").length,
  );
  expect(historyLen).toBe(backup.history.length);
});
