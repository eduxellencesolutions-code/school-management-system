// src/app/api/platform-staff/founding-institutions/[id]/candidates/route.ts
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: isSuper } = await supabase.rpc('is_super_admin')
  if (!isSuper) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const q = (req.nextUrl.searchParams.get('q') ?? '').slice(0, 100)
  const { data, error } = await supabase.rpc('search_founding_link_candidates', { p_application_id: id, p_query: q })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ candidates: data ?? [] })
}