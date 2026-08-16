import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Founding500Client from './Founding500Client';

async function getFounding500Data() {
  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from('campaign_slot_counters')
    .select('slots_max, slots_claimed, is_active, promo_duration_days, qualifying_price')
    .eq('campaign_key', 'founding_500')
    .single();

  // FIXED: removed !inner on organizations and representatives.
  // representative_id is nullable — !inner would silently drop any
  // enrollment with no matched representative row from this list
  // entirely, with no error and no visible sign anything was missing.
  const { data: enrollments } = await supabase
    .from('founding500_enrollments')
    .select(`
      id,
      founding_slot_number,
      status,
      amount_paid,
      promo_start_date,
      promo_expires_at,
      created_at,
      organization_id,
      organizations ( id, name, type, subscription_plan ),
      representative_id,
      representatives ( id, full_name, referral_code )
    `)
    .order('founding_slot_number', { ascending: true });

  // Supabase's untyped client returns embedded to-one relations as arrays
  // by default — normalize to single object/null to match Founding500Client's
  // Enrollment type, which reflects the true one-to-one cardinality.
  const normalizedEnrollments = (enrollments || []).map((e) => ({
    ...e,
    organizations: Array.isArray(e.organizations) ? (e.organizations[0] ?? null) : e.organizations,
    representatives: Array.isArray(e.representatives) ? (e.representatives[0] ?? null) : e.representatives,
  }));

  const { data: commissions } = await supabase
    .from('commissions')
    .select('amount, amount_paid, status, created_at')
    .eq('campaign_key', 'founding_500');

  return {
    campaign,
    enrollments: normalizedEnrollments,
    commissions: commissions || [],
  };
}

export default async function Founding500Page() {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) redirect('/login');

  const { data: hasPermission } = await supabase.rpc('has_platform_permission', {
    p_user_id: user.user.id,
    p_permission_key: 'founding500.manage',
  });

  if (!hasPermission) redirect('/dashboard');

  const { campaign, enrollments, commissions } = await getFounding500Data();

  // FIXED: exclude voided commissions from "earned" — matches
  // sync_representative_commission_totals()'s own logic exactly
  // (status != 'voided'), so this dashboard can never silently disagree
  // with a representative's own wallet total.
  const totalCommissionEarned = commissions
    .filter((c) => c.status !== 'voided')
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const totalCommissionPaid = commissions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const slotsRemaining = campaign ? campaign.slots_max - campaign.slots_claimed : 0;
  const percentComplete = campaign
    ? Math.round((campaign.slots_claimed / campaign.slots_max) * 100)
    : 0;

  return (
    <Founding500Client
      campaign={campaign}
      enrollments={enrollments}
      slotsRemaining={slotsRemaining}
      percentComplete={percentComplete}
      totalCommissionEarned={totalCommissionEarned}
      totalCommissionPaid={totalCommissionPaid}
    />
  );
}