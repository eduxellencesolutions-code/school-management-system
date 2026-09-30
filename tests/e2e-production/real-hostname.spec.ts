// PHASE 4: real hostname, real DNS, real Vercel. No Host-header tricks.
//
// Required env vars:
//   E2E_REAL_HOSTNAME   e.g. epis.eduxellence.org
//   E2E_REAL_ORG_NAME   the organization's name as stored (what the login page should show)
// Optional (each test skips if its variables are missing):
//   E2E_REAL_ADMIN_EMAIL, E2E_REAL_ADMIN_PASSWORD   an admin of THAT organization
//   E2E_OTHER_HOSTNAME  a DIFFERENT institution's active hostname
//
// Use a dedicated test admin account, not a real school's admin, and never
// commit these values.

import { test, expect } from '@playwright/test'

const host = process.env.E2E_REAL_HOSTNAME
const orgName = process.env.E2E_REAL_ORG_NAME
const adminEmail = process.env.E2E_REAL_ADMIN_EMAIL
const adminPassword = process.env.E2E_REAL_ADMIN_PASSWORD
const otherHost = process.env.E2E_OTHER_HOSTNAME

test.beforeAll(() => {
  if (!host || !orgName) {
    throw new Error('E2E_REAL_HOSTNAME and E2E_REAL_ORG_NAME are required')
  }
})

test.describe('Phase 4: real hostname reaches the right institution', () => {

  test('institution hostname serves HTTPS and shows that institution\'s branding', async ({ page }) => {
    const res = await page.goto(`https://${host}/login`)
    expect(res?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: orgName! })).toBeVisible()
    await expect(page.getByText('Powered by Eduxellence Results')).toBeVisible()
  })

  test('platform hostname still shows default branding, not the institution\'s', async ({ page }) => {
    await page.goto('https://results.eduxellence.org/login')
    await expect(page.getByRole('heading', { name: /Eduxellence/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: orgName! })).not.toBeVisible()
  })

  test('diagnostic route is not exposed in production', async ({ request }) => {
    const res = await request.get(`https://${host}/api/e2e-diagnostic/host`)
    expect(res.status()).toBe(404)
  })

  test('admin of this organization signs in on its own hostname without a wrong-portal notice', async ({ page }) => {
    test.skip(!adminEmail || !adminPassword, 'admin credentials not provided')
    await page.goto(`https://${host}/login`)
    await page.fill('input[type="email"]', adminEmail!)
    await page.fill('input[type="password"]', adminPassword!)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard|workspaces)/, { timeout: 30_000 })
    await expect(page.getByText("This isn't your portal")).not.toBeVisible()
  })

  test('the same admin on a DIFFERENT institution\'s hostname gets the wrong-portal notice', async ({ page }) => {
    test.skip(!adminEmail || !adminPassword || !otherHost, 'admin credentials or E2E_OTHER_HOSTNAME not provided')
    await page.goto(`https://${otherHost}/login`)
    await page.fill('input[type="email"]', adminEmail!)
    await page.fill('input[type="password"]', adminPassword!)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard|workspaces)/, { timeout: 30_000 })
    await expect(page.getByText("This isn't your portal")).toBeVisible({ timeout: 15_000 })
  })
})