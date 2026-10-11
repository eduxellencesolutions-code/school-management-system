// src/app/api/tertiary/founding/accept/route.ts
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (typeof body.applicationId !== 'string') return NextResponse.json({ error: 'Application is required' }, { status: 400 })

  const { error } = await supabase.rpc('accept_founding_agreement', { p_application_id: body.applicationId })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}