import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const BASE_URL = `http://127.0.0.1:${PORT}`

/**
 * 用本机已安装的 Chrome（channel: 'chrome'），不下载 Playwright 自带的浏览器。
 * 跑之前会先 `pnpm build`，webServer 直接起 `pnpm preview` 服务 dist。
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 900 } }
    },
    {
      name: 'mobile',
      /**
       * 手机尺寸 + 触屏，但关掉 isMobile 的移动视口模拟：
       * isMobile 下 Chrome 的布局视口与命中判定对不上，Playwright 点击会反复被
       * 别的元素"拦截"（实测 innerWidth 报 1397 而不是 393）。关掉后交互稳定，
       * 依然覆盖窄屏 + 触屏场景。
       */
      use: { ...devices['Pixel 5'], channel: 'chrome', isMobile: false }
    }
  ],
  webServer: {
    command: 'pnpm preview',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60_000
  }
})
