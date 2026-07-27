import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

  const pendingCommission = (commissions ?? [])
    .filter(c => c.status === 'pending' || c.status === 'payable')
    .reduce((s, c) => s + c.amount, 0);

  return NextResponse.json({
    representative: rep,
    referrals: enrichedReferrals,
    commissions: commissions ?? [],
    pendingCommission,
  });
}