export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse(null, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
  const issued = await admin.rpc('issue_due_topup_quotes')
  const reminders = await admin.rpc('send_topup_reminders')
  if (issued.error || reminders.error) return NextResponse.json({ error: issued.error?.message ?? reminders.error?.message }, { status: 500 })
  return NextResponse.json({ issued: issued.data, reminders: reminders.data })
}