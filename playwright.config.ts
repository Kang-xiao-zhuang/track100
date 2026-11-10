import { defineConfig, devices } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL: BASE_URL,
    // 静态导出页面不需要 SW;屏蔽它可避免缓存影响断言与重复用例之间的状态。
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // 本地可用 PW_CHANNEL=msedge 复用系统 Edge,免去下载浏览器;CI 走默认 chromium。
        ...(process.env.PW_CHANNEL === "msedge" ? { channel: "msedge" as const } : {}),
      },
    },
  ],
  webServer: {
    command: "node scripts/serve-out.mjs",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
