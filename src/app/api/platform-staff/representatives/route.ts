import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: canView } = await supabase.rpc('has_platform_permission', { p_user_id: user.id, p_permission_key: 'representatives.view' });
  if (!canView) return NextResponse.json({ error: 'You do not have permission to view representatives' }, { status: 403 });

  const { data: reps, error } = await supabase
    .from('representatives')
    .select('id, full_name, email, level, status, territory_state, qualified_customers_count, total_commission_earned, total_commission_paid, joined_at')
    .order('qualified_customers_count', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const repIds = (reps ?? []).map(r => r.id);

  const [{ data: allReferrals }, { data: allCommissions }] = await Promise.all([
    repIds.length > 0 ? supabase.from('referrals').select('representative_id, status').in('representative_id', repIds) : Promise.resolve({ data: [] }),
    repIds.length > 0 ? supabase.from('commissions').select('representative_id, amount, status').in('representative_id', repIds) : Promise.resolve({ data: [] }),
  ]);

  const enriched = (reps ?? []).map(rep => {
    const referrals = (allReferrals ?? []).filter(r => r.representative_id === rep.id);
    const commissions = (allCommissions ?? []).filter(c => c.representative_id === rep.id);
    const paidReferrals = referrals.filter(r => r.status === 'qualified').length;
    const conversionRate = referrals.length > 0 ? Math.round((paidReferrals / referrals.length) * 100) : 0;
    const pendingCommission = commissions.filter(c => c.status === 'pending' || c.status === 'payable').reduce((s, c) => s + c.amount, 0);

    return {
      ...rep,
      totalReferrals: referrals.length,
      qualifiedReferrals: paidReferrals,
      conversionRate,
      pendingCommission,
    };
  });

  return NextResponse.json({ representatives: enriched });
}