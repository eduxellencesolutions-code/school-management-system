// tests/e2e/phase1-application-logic.spec.ts
//
// PHASE 1: application-level logic only, run against local `next dev` via
// hosts-file hostnames. Nothing here proves anything about Vercel's edge
// layer; that is Phase 4, against a real configured hostname.

import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import fs from 'fs'

const fixtures = JSON.parse(fs.readFileSync('tests/e2e/.fixtures.json', 'utf-8'))

const PORT = 3000

// Signs in through the real login form. If the browser never navigates
// away, prints what Supabase's token endpoint returned so the failure has
// a visible cause. The body is only printed for non-200 responses, so a
// successful token is never logged.
async function signIn(
  page: Page,
  host: string,
  email: string,
  password: string,
  urlPattern: RegExp
) {
  let tokenInfo = 'no /auth/v1/token response was seen'
  const startedAt = Date.now()

  page.on('response', async (res) => {
    if (res.url().includes('/auth/v1/token')) {
      if (res.status() === 200) {
        tokenInfo = 'status 200 (body omitted)'
      } else {
        const body = await res.text().catch(() => '<unreadable>')
        tokenInfo = `status ${res.status()}: ${body}`
      }
    }
  })

  await page.goto(`http://${host}:${PORT}/login`)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')

  try {
    // 60s: the first sign-in of a run can trigger cold compiles in `next dev`.
    await page.waitForURL(urlPattern, { timeout: 60_000 })
    console.log(
      `[sign-in] ${email} on ${host} reached ${page.url()} after ` +
      `${((Date.now() - startedAt) / 1000).toFixed(1)}s`
    )
  } catch (err) {
    console.log(
      `\n[SIGN-IN DIAGNOSTIC] ${email} on ${host}\n` +
      `  auth token endpoint -> ${tokenInfo}\n` +
      `  final URL           -> ${page.url()}\n` +
      `  waited              -> ${((Date.now() - startedAt) / 1000).toFixed(1)}s\n`
    )
    throw err
  }
}

test.describe('Phase 1 — PASS: application logic verified locally', () => {

  test('unknown hostname does not resolve to any organization', async ({ page }) => {
    const res = await page.goto(`http://e2e-local-test.eduxellence.org:${PORT}/api/e2e-diagnostic/host`)
    const body = await res?.json()
    expect(body.portalContext.organizationId).toBeNull()
    expect(body.portalContext.isPlatformHost).toBe(false)
  })

  test('platform hostname is recognized as such, not resolved as a tenant', async ({ page }) => {
    const res = await page.goto(`http://localhost:${PORT}/api/e2e-diagnostic/host`)
    const body = await res?.json()
    expect(body.portalContext.isPlatformHost).toBe(true)
    expect(body.portalContext.organizationId).toBeNull()
  })

  test('unverified domain does not resolve, even though the row exists', async ({ page }) => {
    const res = await page.goto(`http://e2e-test-unverified.eduxellence.org:${PORT}/api/e2e-diagnostic/host`)
    const body = await res?.json()
    expect(body.portalContext.organizationId).toBeNull()
    expect(body.portalContext.hostname).toBe('e2e-test-unverified.eduxellence.org')
  })

  test('deactivated domain no longer resolves, even though it was previously active', async ({ page }) => {
    const res = await page.goto(`http://e2e-test-inactive.eduxellence.org:${PORT}/api/e2e-diagnostic/host`)
    const body = await res?.json()
    expect(body.portalContext.organizationId).toBeNull()
  })

  test('verified + active domain resolves to the correct organization', async ({ page }) => {
    const res = await page.goto(`http://e2e-test-active.eduxellence.org:${PORT}/api/e2e-diagnostic/host`)
    const body = await res?.json()
    expect(body.portalContext.organizationId).toBe(fixtures.orgA)
    expect(body.portalContext.isPlatformHost).toBe(false)
  })

  test('login page on an active institution hostname shows that institution\'s branding', async ({ page }) => {
    await page.goto(`http://e2e-test-active.eduxellence.org:${PORT}/login`)
    await expect(page.getByRole('heading', { name: 'TEST_E2E_ORG_A' })).toBeVisible()
    await expect(page.getByText('Powered by Eduxellence Results')).toBeVisible()
  })

  test('login page on the platform hostname shows default Eduxellence branding', async ({ page }) => {
    await page.goto(`http://localhost:${PORT}/login`)
    await expect(page.getByRole('heading', { name: /Eduxellence/ })).toBeVisible()
    await expect(page.getByText('Powered by Eduxellence Results')).not.toBeVisible()
  })

  test('staff: correct organization + correct hostname → dashboard loads, no wrong-portal notice', async ({ page }) => {
    await signIn(
      page, 'e2e-test-active.eduxellence.org',
      fixtures.staffA.email, fixtures.password,
      /\/(dashboard|workspaces)/
    )
    // Positive check first: the dashboard actually rendered with this org's data.
    await expect(page.getByText('TEST_E2E_ORG_A').first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText("This isn't your portal")).not.toBeVisible()
  })

  test('staff: correct organization but WRONG institution hostname → wrong-portal notice', async ({ page }) => {
    await signIn(
      page, 'e2e-test-mismatch.eduxellence.org',
      fixtures.staffA.email, fixtures.password,
      /\/(dashboard|workspaces)/
    )
    await expect(page.getByText("This isn't your portal")).toBeVisible({ timeout: 15000 })
  })

  test('student: signs in on the institution hostname and reaches the student portal', async ({ page }) => {
    await signIn(
      page, 'e2e-test-active.eduxellence.org',
      fixtures.student.email, fixtures.password,
      /\/student/
    )
    await expect(page.getByText("This isn't your portal")).not.toBeVisible()
  })

  test('parent: /access on an active institution hostname shows that institution\'s branding', async ({ page }) => {
    // Branding only. The access-code submission flow is a separate feature
    // and is not exercised here.
    await page.goto(`http://e2e-test-active.eduxellence.org:${PORT}/access`)
    await expect(page.getByRole('heading', { name: 'TEST_E2E_ORG_A' })).toBeVisible()
  })
})