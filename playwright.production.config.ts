import { defineConfig } from '@playwright/test'

// Runs against REAL deployed hostnames. No fixtures, no database setup.
// Required env vars: E2E_REAL_HOSTNAME, E2E_REAL_ORG_NAME.
export default defineConfig({
  testDir: './tests/e2e-production',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
})