import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}$/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const success = body?.success === true
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ?? null
    const userAgent = request.headers.get('user-agent') ?? null
    const admin = createAdminClient()

    let userId: string | null = null
    if (success) {
      // Never trust a client-supplied id for a success; use the signed-in session.
      const supabase = await createClient()
      const { user } = await getAuthenticatedUser(supabase)
      userId = user?.id ?? null
    } else {
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
      if (EMAIL_RE.test(email)) {
        const { data } = await admin.rpc('lookup_auth_user_id', { p_email: email })
        userId = (data as string | null) ?? null
      }
    }

    if (userId) {
      const { error } = await admin.rpc('record_login_attempt', {
        p_user_id: userId, p_success: success, p_ip: ip, p_user_agent: userAgent,
      })
      if (error) console.error('record_login_attempt error:', error.message)
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('record-login route error:', err)
    return NextResponse.json({ ok: true })
  }
}