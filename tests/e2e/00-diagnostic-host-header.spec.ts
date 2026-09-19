// tests/e2e/00-diagnostic-host-header.spec.ts
//
// Answers, with real evidence, the five questions from the instruction
// before ANY hostname-dependent test in this suite is trusted:
//   1. current deployment URL (from E2E_BASE_URL, printed for the record)
//   2. does the deployment accept a Host header override at all
//   3. does Vercel's routing/proxy layer preserve it
//   4. does the app (this route, standing in for middleware/layouts) see it
//   5. redirects/cookies interference — checked separately, not assumed
//
// This test does not assert pass/fail on the simulated hostname matching —
// it reports what actually happened, because the answer to "does this
// work" is itself the result we need, not something to assume going in.

import { test } from '@playwright/test'

test('DIAGNOSTIC: report what Vercel/Next.js actually does with a Host header override', async ({ request }, testInfo) => {
  const baseURL = testInfo.project.use.baseURL as string
  const simulatedHost = 'e2e-diagnostic-test.eduxellence.org'

  console.log(`\n=== HOST HEADER DIAGNOSTIC ===`)
  console.log(`Base URL under test: ${baseURL}`)
  console.log(`Simulated Host header sent: ${simulatedHost}`)

  const response = await request.get('/api/_e2e-diagnostic/host', {
    headers: { Host: simulatedHost },
  })

  console.log(`HTTP status: ${response.status()}`)

  if (!response.ok()) {
    console.log(`Response NOT OK. This itself is a finding — report the status code and body.`)
    console.log(`Body: ${await response.text()}`)
    return
  }

  const body = await response.json()
  console.log(`App-visible host header:            ${body.hostHeader}`)
  console.log(`App-visible x-forwarded-host header: ${body.xForwardedHost}`)
  console.log(`\nDid the simulated host survive to the app? ${body.hostHeader === simulatedHost ? 'YES' : 'NO'}`)
  console.log(`\nAll headers seen by the app:`)
  console.log(JSON.stringify(body.allHeaders, null, 2))
  console.log(`\n=== END DIAGNOSTIC ===\n`)
})