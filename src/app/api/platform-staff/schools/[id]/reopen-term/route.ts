import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: orgId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { termId, reason } = await request.json()
  if (!termId || !reason || !reason.trim()) {
    return NextResponse.json({ error: 'termId and a reason are required' }, { status: 400 })
  }

  const { error } = await supabase.rpc('reopen_term', { p_term_id: termId, p_reason: reason })
  if (error) return NextResponse.json({ error: error.message }, { status: 422 })
  return NextResponse.json({ success: true })
}