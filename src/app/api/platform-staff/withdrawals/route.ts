import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: canApprove } = await supabase.rpc('has_platform_permission', {
    p_user_id: user.id,
    p_permission_key: 'commissions.approve',
  })
  if (!canApprove) return NextResponse.json({ error: 'You do not have permission to view withdrawals' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('withdrawals')
    .select('id, representative_id, amount_requested, amount_claimed, status, requires_finance_approval, date_requested, payment_reference, rejection_reason')
    .order('date_requested', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data: withdrawals, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const repIds = [...new Set((withdrawals ?? []).map(w => w.representative_id))]
  const { data: reps } = repIds.length > 0
    ? await supabase.from('representatives').select('id, full_name').in('id', repIds)
    : { data: [] }
  const repMap = new Map((reps ?? []).map(r => [r.id, r.full_name]))

  return NextResponse.json({
    withdrawals: (withdrawals ?? []).map(w => ({ ...w, representativeName: repMap.get(w.representative_id) ?? 'Unknown' })),
  })
}