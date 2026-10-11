// src/app/api/tertiary/founding/route.ts
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function GET() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data, error } = await supabase.rpc('get_my_founding_application')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ application: data ?? null })
}