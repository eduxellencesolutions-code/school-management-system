// src/app/api/cron/drain-signup-outbox/route.ts
//
// Drains pending (and retry-eligible failed) rows from the
// signup_notification_outbox by invoking the dispatch webhook for each
// row. The webhook does the actual Resend send and status update —
// this route only fans out. Backoff/retry logic lives in the webhook,
// so this route can be scheduled frequently (every 5 min) without
// hammering failed rows faster than their next_attempt_at allows.
//
// Auth: Authorization: Bearer <CRON_SECRET>, matching the other cron routes.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BATCH_SIZE = 25

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse(null, { status: 401 })
  }

  const dispatchSecret = process.env.SIGNUP_NOTIFICATION_WEBHOOK_SECRET
  if (!dispatchSecret) {
    console.error('drain-signup-outbox: SIGNUP_NOTIFICATION_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const admin = createAdminClient()
  const nowIso = new Date().toISOString()

  // Eligible rows: never-tried, or previously failed and past their backoff.
  const { data: rows, error } = await admin
    .from('signup_notification_outbox')
    .select('id')
    .or(`status.eq.pending,and(status.eq.failed,next_attempt_at.lte.${nowIso})`)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (error) {
    console.error('drain-signup-outbox: query failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ ok: true, attempted: 0, succeeded: 0, failed: 0 })
  }

  const dispatchUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://admin.eduxellence.org'}/api/webhooks/signup-notification`

  let succeeded = 0
  let failed = 0

  for (const row of rows) {
    try {
      const res = await fetch(dispatchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signup-notification-secret': dispatchSecret,
        },
        body: JSON.stringify({ outboxId: row.id }),
      })

      if (res.ok) {
        succeeded++
      } else {
        failed++
        const text = await res.text().catch(() => '')
        console.error(`drain-signup-outbox: dispatch ${row.id} returned ${res.status}`, text)
      }
    } catch (err) {
      failed++
      console.error(`drain-signup-outbox: dispatch ${row.id} threw`, err)
    }
  }

  return NextResponse.json({
    ok: true,
    attempted: rows.length,
    succeeded,
    failed,
  })
}