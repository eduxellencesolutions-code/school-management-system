// tests/e2e/01-diagnostic-page-navigation-host.spec.ts
//
// The prior diagnostic (00-diagnostic-host-header) proved that a Host
// header override survives Playwright's API request context
// (request.get()). This checks the SEPARATE question of whether it also
// survives a real browser page navigation (page.goto()), because
// browsers can handle Host differently for top-level navigation than
// for a background fetch.
//
// METHOD NOTE: extraHTTPHeaders on the browser context would apply the
// spoofed Host to EVERY request, including the initial navigation to
// the dev server itself. Chrome rejects that class of mismatch, so we
// instead intercept the outgoing request at the route level and set
// the header on that one request only. This is the correct mechanism
// for this test, not a workaround.
//
// Same reporting-only philosophy as the first diagnostic: does not
// assert pass/fail on the outcome — reports what actually happened.

import { test } from '@playwright/test'

const SIMULATED_HOST = 'e2e-diagnostic-test.eduxellence.org'

test('DIAGNOSTIC: does Host header override survive a real page.goto() navigation?', async ({ page }) => {
  await page.route('/api/e2e-diagnostic/host', async (route) => {
    await route.continue({
      headers: { ...route.request().headers(), host: SIMULATED_HOST },
    })
  })

  const response = await page.goto('/api/e2e-diagnostic/host')

  console.log(`\n=== PAGE NAVIGATION HOST DIAGNOSTIC ===`)
  console.log(`Simulated Host header sent: ${SIMULATED_HOST}`)
  console.log(`HTTP status: ${response?.status()}`)

  if (!response) {
    console.log(`No response object returned from page.goto — navigation may have failed.`)
    console.log(`=== END DIAGNOSTIC ===\n`)
    return
  }

  if (!response.ok()) {
    console.log(`Response NOT OK. This itself is a finding.`)
    console.log(`Body: ${await response.text()}`)
    console.log(`=== END DIAGNOSTIC ===\n`)
    return
  }

  const body = await response.json()
  console.log(`App-visible host header:            ${body?.hostHeader}`)
  console.log(`App-visible x-forwarded-host header: ${body?.xForwardedHost}`)
  console.log(`Did the simulated host survive a real page.goto()? ${body?.hostHeader === SIMULATED_HOST ? 'YES' : 'NO'}`)
  console.log(`\nAll headers seen by the app:`)
  console.log(JSON.stringify(body?.allHeaders, null, 2))
  console.log(`=== END DIAGNOSTIC ===\n`)
})