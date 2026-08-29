import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: hasPermission } = await supabase.rpc('has_platform_permission', {
    p_user_id: user.id,
    p_permission_key: 'commissions.approve',
  });
  if (!hasPermission) {
    return NextResponse.json({ error: 'You do not have permission to manage withdrawals' }, { status: 403 });
  }

  const { action, reason, paymentReference } = await request.json();

  let error;
  if (action === 'approve') {
    ({ error } = await supabase.rpc('approve_withdrawal', { p_withdrawal_id: id }));
  } else if (action === 'reject') {
    ({ error } = await supabase.rpc('reject_withdrawal', { p_withdrawal_id: id, p_reason: reason ?? 'Rejected by staff' }));
  } else if (action === 'mark_paid') {
    if (!paymentReference) return NextResponse.json({ error: 'paymentReference is required' }, { status: 400 });
    ({ error } = await supabase.rpc('mark_withdrawal_paid', { p_withdrawal_id: id, p_payment_reference: paymentReference }));
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 422 });

  return NextResponse.json({ success: true });
}