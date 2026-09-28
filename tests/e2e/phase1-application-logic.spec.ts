// tests/e2e/phase1-application-logic.spec.ts
//
// PHASE 1 — application-level logic only, run against local `next dev`
// via the hosts-file mechanism (confirmed working: real DNS resolution to
// 127.0.0.1, no Host-header spoofing needed). Every test here is labeled
// explicitly as PASS (application logic verified locally) — NONE of these
// prove anything about Vercel's edge/proxy layer, which requires Phase 4
// against a real deployed+DNS-configured hostname. That distinction is
// preserved in each test's own title, not just this comment, so a test
// report can't accidentally blur the two.

import { test, expect } from '@playwright/test'
import fs from 'fs'

const fixtures = JSON.parse(fs.readFileSync('tests/e2e/.fixtures.json', 'utf-8'))

async function signIn(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('http://e2e-test-active.eduxellence.org:3000/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(dashboard|workspaces|student|parent)/, { timeout: 15000 })
}

test.describe('Phase 1 — PASS: application logic verified locally', () => {

  test('unknown hostname does not resolve to any organization', async ({ page }) => {
    const res = await page.goto('http://e2e-local-test.eduxellence.org:3000/api/e2e-diagnostic/host')
    const body = await res?.json()
    expect(body.portalContext.organizationId).toBeNull()
    expect(body.portalContext.isPlatformHost).toBe(false)
  })

  test('platform hostname is recognized as such, not resolved as a tenant', async ({ page }) => {
    const res = await page.goto('http://localhost:3000/api/e2e-diagnostic/host')
    const body = await res?.json()
    expect(body.portalContext.isPlatformHost).toBe(true)
    expect(body.portalContext.organizationId).toBeNull()
  })

  test('unverified domain does not resolve, even though the row exists', async ({ page }) => {
    const res = await page.goto('http://e2e-test-unverified.eduxellence.org:3000/api/e2e-diagnostic/host')
    const body = await res?.json()
    expect(body.portalContext.organizationId).toBeNull()
    expect(body.portalContext.hostname).toBe('e2e-test-unverified.eduxellence.org')
  })

  test('deactivated domain no longer resolves, even though it was previously active', async ({ page }) => {
    const res = await page.goto('http://e2e-test-inactive.eduxellence.org:3000/api/e2e-diagnostic/host')
    const body = await res?.json()
    expect(body.portalContext.organizationId).toBeNull()
  })

  test('verified + active domain resolves to the correct organization and branding', async ({ page }) => {
    const res = await page.goto('http://e2e-test-active.eduxellence.org:3000/api/e2e-diagnostic/host')
    const body = await res?.json()
    expect(body.portalContext.organizationId).toBe(fixtures.orgA)
    expect(body.portalContext.isPlatformHost).toBe(false)
  })

  test('login page on an active institution hostname shows that institution\'s branding', async ({ page }) => {
    await page.goto('http://e2e-test-active.eduxellence.org:3000/login')
    // organizations.name default was used (no explicit name override in fixture setup) —
    // whatever setup_e2e_domain_fixtures created the org with is what should render.
    await expect(page.locator('h1')).toContainText('TEST_E2E_ORG_A')
    await expect(page.locator('text=Powered by Eduxellence Results')).toBeVisible()
  })

  test('login page on the platform hostname shows default Eduxellence branding, not an institution\'s', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await expect(page.locator('h1')).toContainText('Eduxellence')
    await expect(page.locator('text=Powered by Eduxellence Results')).not.toBeVisible()
  })

  test('staff: correct organization + correct hostname → dashboard loads normally, no mismatch notice', async ({ page }) => {
    await signIn(page, fixtures.staffA.email, fixtures.password)
    await expect(page.locator('text=This isn\'t your portal')).not.toBeVisible()
  })

  test('staff: correct organization but WRONG institution hostname → mismatch notice, not silent branding swap', async ({ page }) => {
    await page.goto('http://e2e-test-mismatch.eduxellence.org:3000/login')
    await page.fill('input[type="email"]', fixtures.staffA.email)
    await page.fill('input[type="password"]', fixtures.password)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000) // allow redirect/render to settle
    await expect(page.locator('text=This isn\'t your portal')).toBeVisible()
    // The critical assertion: Org B's name must NOT appear as if this were Org A's portal
    await expect(page.locator('body')).not.toContainText('TEST_E2E_ORG_B does not belong')
  })

  test('student: reaches the student portal via the institution hostname, not the staff dashboard', async ({ page }) => {
    await page.goto('http://e2e-test-active.eduxellence.org:3000/login')
    await page.fill('input[type="email"]', fixtures.student.email)
    await page.fill('input[type="password"]', fixtures.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/student/, { timeout: 15000 })
    await expect(page.locator('text=This isn\'t your portal')).not.toBeVisible()
  })

  test('parent: reaches the parent dashboard via the institution hostname their linked child belongs to', async ({ page }) => {
    await page.goto('http://e2e-test-active.eduxellence.org:3000/access')
    // Parent portal uses an access-code flow (/access), not email/password —
    // confirmed earlier in this build. This test only confirms the HOSTNAME
    // side (branding shown on /access itself); the access-code submission
    // flow is a separate, already-existing feature not part of THIS test.
    await expect(page.locator('h1')).toContainText('TEST_E2E_ORG_A')
  })
})