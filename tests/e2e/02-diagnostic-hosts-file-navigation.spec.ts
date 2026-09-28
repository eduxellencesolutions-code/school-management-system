// tests/e2e/02-diagnostic-hosts-file-navigation.spec.ts
//
// Tests whether a hosts-file-mapped hostname produces a genuinely correct
// Host header on real page.goto() navigation, with zero header overriding —
// the browser sets Host naturally because it matches the actual URL.

import { test } from '@playwright/test'

test('DIAGNOSTIC: hosts-file-mapped hostname produces a real, correct Host header', async ({ page }) => {
  const response = await page.goto('http://e2e-local-test.eduxellence.org:3000/api/e2e-diagnostic/host')
  const body = await response?.json()

  console.log(`\n=== HOSTS-FILE NAVIGATION DIAGNOSTIC ===`)
  console.log(`Status: ${response?.status()}`)
  console.log(`App-visible host header: ${body?.hostHeader}`)
  console.log(`Matches expected? ${body?.hostHeader === 'e2e-local-test.eduxellence.org:3000' ? 'YES' : 'NO'}`)
  console.log(`=== END DIAGNOSTIC ===\n`)
})