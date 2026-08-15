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
  const { action, reason, paymentReference } = body; // action: 'approve' | 'reject' | 'mark_paid' | 'early_release'

  const { data: commission } = await supabase.from('commissions').select('representative_id, amount, status, hold_until').eq('id', id).single();
  if (!commission) return NextResponse.json({ error: 'Commission not found' }, { status: 404 });

  // Early release override — separate permission, mandatory reason, full audit trail.
  // Goes through a SECURITY DEFINER function rather than a direct .update(),
  // since it needs to both check a second permission and write the audit
  // record atomically with the status change.
  if (action === 'early_release') {
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'A reason is required for an early release override' }, { status: 400 });
    }
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

    const { error } = await supabase.rpc('early_release_commission', {
      p_commission_id: id,
      p_reason: reason,
      p_ip_address: ipAddress,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 422 });
    return NextResponse.json({ success: true });
  }

  // ✅ FIX: Route reject through void_commission() instead of bare update
  // void_commission() already logs commission_voided internally — no duplicate log call needed
  if (action === 'reject') {
    const { error } = await supabase.rpc('void_commission', {
      p_commission_id: id,
      p_reason: reason ?? 'Rejected by staff',
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 422 });
    return NextResponse.json({ success: true });
  }

  let updates: Record<string, any> = {};
  if (action === 'approve') {
    // The 14-day hold is a hard rule for normal approval. If it hasn't
    // expired, don't silently bypass it — tell the frontend explicitly
    // so it can show the warning and offer the override path instead.
    if (commission.status === 'pending') {
      const holdUntil = new Date(commission.hold_until);
      if (holdUntil > new Date()) {
        return NextResponse.json({
          error: 'holding_period_active',
          message: 'This commission is still within its 14-day holding period and cannot be approved normally.',
          holdUntil: commission.hold_until,
        }, { status: 422 });
      }
    }
    updates = { status: 'payable' };
  } else if (action === 'mark_paid') {
    // ✅ FIX: Add status guard — only payable commissions can be marked paid
    if (commission.status !== 'payable') {
      return NextResponse.json({
        error: 'invalid_status',
        message: `Cannot mark paid — commission is in status ${commission.status}, expected payable`,
      }, { status: 422 });
    }
    updates = { status: 'paid', paid_at: new Date().toISOString() };
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const { error } = await supabase.from('commissions').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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