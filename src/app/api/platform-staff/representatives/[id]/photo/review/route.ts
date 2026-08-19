import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { approve, reason } = await request.json()
  if (typeof approve !== 'boolean') return NextResponse.json({ error: 'approve (boolean) is required' }, { status: 400 })

  const { error } = await supabase.rpc('review_representative_passport', {
    p_rep_id: id, p_approve: approve, p_reason: reason ?? null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 422 })
  return NextResponse.json({ success: true })
}