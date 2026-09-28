// playwright.config.ts
import { defineConfig } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL

if (!baseURL) {
  throw new Error(
    'E2E_BASE_URL is required (e.g. http://e2e-local-test.eduxellence.org:3000 for ' +
    'Phase 1 hosts-file testing, or a real Vercel deployment URL for Phase 4). ' +
    'No URL is hard-coded into this config, per instruction.'
  )
}

export default defineConfig({
  testDir: './tests/e2e',

  // Creates the four domain fixtures + staff/student/parent test identities
  // once before the whole suite runs, and tears them all down after —
  // see tests/e2e/global-setup.ts and global-teardown.ts.
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',

  // Hostname/tenant tests share fixtures created by globalSetup — keep
  // sequential until proven safe to parallelize against shared fixture data.
  fullyParallel: false,
  workers: 1,

  retries: 0, // no retries yet — a flaky pass would hide a real routing problem

  reporter: 'list',

  use: {
    baseURL,
    extraHTTPHeaders: {},
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
})