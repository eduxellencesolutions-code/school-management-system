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
    .select('id, full_name, email, phone, referral_code, level, status, territory_state, qualified_customers_count, commission_rate, total_commission_earned, total_commission_paid, joined_at, photo_url, photo_status, photo_rejection_reason, photo_reviewed_at')
    .order('joined_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const repIds = (reps ?? []).map(r => r.id);

  const { data: latestVersion } = await supabase
    .from('representative_agreement_versions')
    .select('id, version')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: growthTiers } = await supabase
    .from('growth_level_thresholds')
    .select('level, label, min_schools, commission_rate')
    .order('level', { ascending: true });

  const [{ data: allReferrals }, { data: allCommissions }, { data: allBankAccounts }, { data: allAcceptances }] = await Promise.all([
    repIds.length > 0 ? supabase.from('referrals').select('representative_id, status').in('representative_id', repIds) : Promise.resolve({ data: [] }),
    repIds.length > 0 ? supabase.from('commissions').select('representative_id, amount, status').in('representative_id', repIds) : Promise.resolve({ data: [] }),
    repIds.length > 0 ? supabase.from('bank_accounts').select('id, representative_id, bank_name, account_number, account_name, is_verified').in('representative_id', repIds) : Promise.resolve({ data: [] }),
    repIds.length > 0 && latestVersion ? supabase.from('representative_agreement_acceptances').select('representative_id, accepted_at').eq('agreement_version_id', latestVersion.id).in('representative_id', repIds) : Promise.resolve({ data: [] }),
  ]);

  function growthLevelFor(qualifiedCount: number) {
    const sorted = growthTiers ?? [];
    let current = sorted[0];
    for (const tier of sorted) {
      if (qualifiedCount >= tier.min_schools) current = tier;
    }
    return current ?? { level: 1, label: 'Starter' };
  }

  const enriched = (reps ?? []).map(rep => {
    const referrals = (allReferrals ?? []).filter(r => r.representative_id === rep.id);
    const commissions = (allCommissions ?? []).filter(c => c.representative_id === rep.id);
    const paidReferrals = referrals.filter(r => r.status === 'qualified').length;
    const conversionRate = referrals.length > 0 ? Math.round((paidReferrals / referrals.length) * 100) : 0;
    const pendingCommission = commissions.filter(c => c.status === 'pending' || c.status === 'payable').reduce((s, c) => s + c.amount, 0);
    const bankAccounts = (allBankAccounts ?? []).filter(b => b.representative_id === rep.id);
    const acceptance = (allAcceptances ?? []).find(a => a.representative_id === rep.id);
    const tier = growthLevelFor(rep.qualified_customers_count);
    return {
      ...rep,
      totalReferrals: referrals.length,
      qualifiedReferrals: paidReferrals,
      conversionRate,
      pendingCommission,
      bankAccounts,
      agreementAccepted: !!acceptance,
      agreementAcceptedAt: acceptance?.accepted_at ?? null,
      agreementVersion: latestVersion?.version ?? null,
      growthLevel: tier.level,
      growthLabel: tier.label,
    };
  });

  return NextResponse.json({ representatives: enriched });
}
