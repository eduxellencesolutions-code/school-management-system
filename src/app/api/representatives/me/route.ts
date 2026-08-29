import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function GET() {
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: rep, error } = await supabase
    .from('representatives')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !rep) return NextResponse.json({ error: 'You do not have representative access' }, { status: 403 });

  const { data: referrals } = await supabase
    .from('referrals')
    .select('id, organization_id, referred_user_id, status, referred_at, qualified_at')
    .eq('representative_id', rep.id)
    .order('referred_at', { ascending: false });

  const orgIds = [...new Set((referrals ?? []).map(r => r.organization_id).filter(Boolean))];
  const userIds = [...new Set((referrals ?? []).map(r => r.referred_user_id).filter(Boolean))];

  const [{ data: orgs }, { data: refUsers }] = await Promise.all([
    orgIds.length > 0 ? supabase.from('organizations').select('id, name').in('id', orgIds) : Promise.resolve({ data: [] }),
    userIds.length > 0 ? supabase.from('users').select('id, name').in('id', userIds) : Promise.resolve({ data: [] }),
  ]);

  const orgMap = new Map((orgs ?? []).map(o => [o.id, o.name]));
  const userMap = new Map((refUsers ?? []).map(u => [u.id, u.name]));

  const enrichedReferrals = (referrals ?? []).map(r => ({
    id: r.id,
    status: r.status,
    referredAt: r.referred_at,
    qualifiedAt: r.qualified_at,
    targetType: r.organization_id ? 'school' : 'solo_teacher',
    targetName: r.organization_id ? (orgMap.get(r.organization_id) ?? 'School') : (userMap.get(r.referred_user_id) ?? 'Solo Teacher'),
  }));

  const { data: commissions } = await supabase
    .from('commissions')
    .select('id, amount, status, subscription_plan, created_at, paid_at')
    .eq('representative_id', rep.id)
    .order('created_at', { ascending: false });

  // Wallet breakdown per spec: five distinct numbers, each a separate business event.
  const pendingAmount = (commissions ?? [])
    .filter(c => c.status === 'pending')
    .reduce((s, c) => s + Number(c.amount), 0);

  const availableAmount = (commissions ?? [])
    .filter(c => c.status === 'payable')
    .reduce((s, c) => s + Number(c.amount), 0);

  const { data: bankAccounts } = await supabase
    .from('bank_accounts')
    .select('id, bank_name, account_number, account_name, is_primary, is_verified')
    .eq('representative_id', rep.id)
    .order('created_at', { ascending: false });

  const { data: withdrawals } = await supabase
    .from('withdrawals')
    .select('id, amount_requested, amount_claimed, status, date_requested, date_paid, payment_reference, rejection_reason')
    .eq('representative_id', rep.id)
    .order('date_requested', { ascending: false });

  return NextResponse.json({
    representative: rep,
    referrals: enrichedReferrals,
    commissions: commissions ?? [],
    wallet: {
      totalEarned: Number(rep.total_commission_earned),   // Pending + Payable + Paid, all-time
      pending: pendingAmount,                               // still in 14-day hold
      available: availableAmount,                           // payable, not yet withdrawal-locked
      withdrawn: Number(rep.total_commission_paid),          // actually paid out
      walletBalance: availableAmount,                        // = available; this is what's requestable right now
    },
    bankAccounts: bankAccounts ?? [],
    withdrawals: withdrawals ?? [],
    // kept for backward compatibility with anything else reading this field
    pendingCommission: pendingAmount + availableAmount,
  });
}