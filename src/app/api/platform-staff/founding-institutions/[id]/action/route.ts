// src/app/api/platform-staff/founding-institutions/[id]/action/route.ts
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: isSuper } = await supabase.rpc('is_super_admin')
  if (!isSuper) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { action, reason } = await req.json()

  let result
  if (action === 'start_review') {
    result = await supabase.rpc('start_founding_application_review', { p_application_id: id })
  } else if (action === 'qualify') {
    result = await supabase.rpc('qualify_founding_application', { p_application_id: id, p_reason: reason || null })
  } else if (action === 'reject') {
    result = await supabase.rpc('reject_founding_application', { p_application_id: id, p_reason: reason })
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 })
  return NextResponse.json({ success: true, data: result.data })
}