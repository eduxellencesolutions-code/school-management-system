// playwright.config.ts
import { defineConfig } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL

if (!baseURL) {
  throw new Error(
    'E2E_BASE_URL is required (e.g. http://e2e-test-active.eduxellence.org:3000 for ' +
    'local hosts-file testing, or a real deployed hostname for Phase 4). ' +
    'No URL is hard-coded, per instruction.'
  )
}

export default defineConfig({
  testDir: './tests/e2e',

  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',

  // Tests share fixtures created in globalSetup, so run one at a time.
  fullyParallel: false,
  workers: 1,

  // No retries: a flaky pass would hide a real routing problem.
  retries: 0,

  // `next dev` compiles each route on first visit, which can take 15-20s.
  timeout: 90_000,
  expect: { timeout: 15_000 },

  reporter: 'list',

  use: {
    baseURL,
    extraHTTPHeaders: {},
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
})