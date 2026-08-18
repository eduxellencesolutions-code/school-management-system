import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { error } = await supabase.rpc('verify_bank_account', { p_bank_account_id: id })
  if (error) return NextResponse.json({ error: error.message }, { status: 422 })
  return NextResponse.json({ success: true })
}