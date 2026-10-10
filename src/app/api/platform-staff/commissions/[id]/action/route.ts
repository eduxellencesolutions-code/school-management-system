import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: canApprove } = await supabase.rpc('has_platform_permission', { p_user_id: user.id, p_permission_key: 'commissions.approve' });
  if (!canApprove) return NextResponse.json({ error: 'You do not have permission to manage commissions' }, { status: 403 });

  const { action, reason } = await request.json(); // 'approve' | 'reject' | 'early_release'

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

  if (action === 'reject') {
    const { error } = await supabase.rpc('void_commission', {
      p_commission_id: id,
      p_reason: reason ?? 'Rejected by staff',
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 422 });
    return NextResponse.json({ success: true });
  }

  if (action === 'approve') {
    const { error } = await supabase.rpc('approve_commission', { p_commission_id: id });
    if (error) {
      if (error.message.startsWith('holding_period_active')) {
        const { data: c } = await supabase.from('commissions').select('hold_until').eq('id', id).single();
        return NextResponse.json({
          error: 'holding_period_active',
          message: 'This commission is still within its 14-day holding period and cannot be approved normally.',
          holdUntil: c?.hold_until ?? null,
        }, { status: 422 });
      }
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}