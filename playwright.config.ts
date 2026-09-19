// playwright.config.ts
import { defineConfig } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL

if (!baseURL) {
  throw new Error(
    'E2E_BASE_URL is required (e.g. your Vercel preview/production URL). ' +
    'No production URL is hard-coded into this config, per instruction.'
  )
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // hostname/tenant tests share fixtures; keep sequential until proven safe to parallelize
  retries: 0, // no retries yet — a flaky pass would hide a real routing problem
  reporter: 'list',
  use: {
    baseURL,
    extraHTTPHeaders: {},
    trace: 'retain-on-failure',
  },
})