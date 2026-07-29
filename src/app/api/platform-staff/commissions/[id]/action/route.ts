import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: canApprove } = await supabase.rpc('has_platform_permission', { p_user_id: user.id, p_permission_key: 'commissions.approve' });
  if (!canApprove) return NextResponse.json({ error: 'You do not have permission to manage commissions' }, { status: 403 });

  const body = await request.json();
  const { action, reason, paymentReference } = body; // action: 'approve' | 'reject' | 'mark_paid'

  const { data: commission } = await supabase.from('commissions').select('representative_id, amount, status').eq('id', id).single();
  if (!commission) return NextResponse.json({ error: 'Commission not found' }, { status: 404 });

  let updates: Record<string, any> = {};
  if (action === 'approve') {
    updates = { status: 'payable' };
  } else if (action === 'reject') {
    updates = { status: 'voided', voided_reason: reason ?? 'Rejected by staff' };
  } else if (action === 'mark_paid') {
    updates = { status: 'paid', paid_at: new Date().toISOString() };
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const { error } = await supabase.from('commissions').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Keep representative's running totals in sync
  if (action === 'mark_paid') {
    await supabase.rpc('increment_rep_paid_commission', { p_rep_id: commission.representative_id, p_amount: commission.amount });
  }

  await supabase.rpc('log_platform_action', {
    p_actor_id: user.id,
    p_action: `commission_${action}`,
    p_target_type: 'commission',
    p_target_id: id,
    p_reason: reason ?? null,
    p_metadata: { paymentReference: paymentReference ?? null },
  });

  return NextResponse.json({ success: true });
}