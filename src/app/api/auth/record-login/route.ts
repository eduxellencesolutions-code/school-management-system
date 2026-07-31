import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { email, userId, success } = await request.json()

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      null
    const userAgent = request.headers.get('user-agent') ?? null

    const admin = createAdminClient()

    let resolvedUserId = userId ?? null

    // On failed logins we won't have a session yet, so resolve the id from
    // Supabase Auth directly rather than assuming public.users has an email column.
    if (!resolvedUserId && email) {
      const normalizedEmail = email.trim().toLowerCase()

      // listUsers doesn't support filtering by email server-side in all SDK
      // versions, so we page through and match. Fine at low-to-moderate user
      // counts; if this project grows large, switch to a public.users lookup
      // or a dedicated email->id index instead.
      let page = 1
      const perPage = 200
      while (!resolvedUserId) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
        if (error || !data?.users?.length) break

        const match = data.users.find(
          u => u.email?.toLowerCase() === normalizedEmail
        )
        if (match) {
          resolvedUserId = match.id
          break
        }

        if (data.users.length < perPage) break // last page
        page += 1
      }
    }

    // If we can't resolve a user (e.g. email doesn't exist), there's nothing
    // to log against — login_history.user_id is not-null by design. Silently
    // no-op rather than leaking "this email doesn't exist" via a different code path.
    if (!resolvedUserId) {
      return NextResponse.json({ ok: true })
    }

    const { error } = await admin.rpc('record_login_attempt', {
      p_user_id: resolvedUserId,
      p_success: success,
      p_ip: ip,
      p_user_agent: userAgent,
    })

    if (error) console.error('record_login_attempt error:', error.message)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('record-login route error:', err)
    // Never fail the login flow because logging failed.
    return NextResponse.json({ ok: true })
  }
}