import { defineConfig } from "@playwright/test"

const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || "127.0.0.1"

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    trace: "on-first-retry",
    headless: true,
  },
  webServer: {
    command: `npm run dev -- --hostname ${HOST} --port ${PORT}`,
    url: `http://${HOST}:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      GITHUB_ID: "playwright",
      GITHUB_SECRET: "playwright",
      NEXTAUTH_SECRET: "playwright_secret",
      NEXTAUTH_URL: `http://${HOST}:${PORT}`,
    },
  },
})
