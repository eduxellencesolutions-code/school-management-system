// src/app/api/representatives/schools/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function GET() {
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: rep } = await supabase
    .from('representatives')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!rep) return NextResponse.json({ error: 'You do not have representative access' }, { status: 403 });

  // "My Schools" now reflects CURRENT portfolio responsibility, not
  // original referral attribution — a rep who was reassigned away from
  // a school no longer sees it here, even though they remain the
  // permanent original referrer for commission purposes (referrals
  // table, untouched). See school_portfolio_assignments.
  const { data: assignments, error } = await supabase
    .from('school_portfolio_assignments')
    .select('organization_id, assigned_at')
    .eq('representative_id', rep.id)
    .is('unassigned_at', null)
    .order('assigned_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orgIds = (assignments ?? []).map(a => a.organization_id);
  if (orgIds.length === 0) return NextResponse.json({ schools: [] });

  // referred_at / qualified_at are still pulled from referrals for display
  // purposes ("date registered" is a referral-time fact, not an
  // assignment-time fact) — but the LIST of schools itself no longer
  // comes from referrals.
  const [{ data: orgs }, { data: referralRows }, { data: relationships }, { data: escalations }] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, name, address, principal_name, principal_title, contact_phone, contact_email, phone, email, subscription_plan, subscription_status, subscription_expires_at, created_at')
      .in('id', orgIds),
    supabase
      .from('referrals')
      .select('organization_id, referred_at, qualified_at, referral_code')
      .in('organization_id', orgIds),
    supabase
      .from('representative_school_relationships')
      .select('organization_id, health_status, last_contact_at, next_follow_up_at, follow_up_status')
      .eq('representative_id', rep.id)
      .in('organization_id', orgIds),
    supabase
      .from('support_tickets')
      .select('organization_id, status')
      .eq('representative_id', rep.id)
      .in('organization_id', orgIds),
  ]);

  const orgMap = new Map((orgs ?? []).map(o => [o.id, o]));
  const referralMap = new Map((referralRows ?? []).map(r => [r.organization_id, r]));
  const relMap = new Map((relationships ?? []).map(r => [r.organization_id, r]));
  const assignedAtMap = new Map((assignments ?? []).map(a => [a.organization_id, a.assigned_at]));

  const escalationCounts = new Map<string, number>();
  (escalations ?? []).forEach(t => {
    if (t.status === 'resolved' || t.status === 'closed') return;
    escalationCounts.set(t.organization_id, (escalationCounts.get(t.organization_id) ?? 0) + 1);
  });

  const schools = orgIds
    .filter(id => orgMap.has(id))
    .map(id => {
      const org = orgMap.get(id)!;
      const referral = referralMap.get(id);
      const rel = relMap.get(id);
      return {
        organizationId: org.id,
        name: org.name,
        address: org.address,
        principalName: org.principal_name,
        contactPhone: org.contact_phone ?? org.phone,
        contactEmail: org.contact_email ?? org.email,
        subscriptionPlan: org.subscription_plan,
        subscriptionStatus: org.subscription_status,
        subscriptionExpiresAt: org.subscription_expires_at,
        referredAt: referral?.referred_at ?? null,
        joinedAt: referral?.qualified_at ?? null,
        assignedAt: assignedAtMap.get(id) ?? null,
        healthStatus: rel?.health_status ?? 'no_recent_contact',
        lastContactAt: rel?.last_contact_at ?? null,
        nextFollowUpAt: rel?.next_follow_up_at ?? null,
        followUpStatus: rel?.follow_up_status ?? 'none',
        openEscalations: escalationCounts.get(id) ?? 0,
      };
    })
    // most recently assigned first — matches the assignment-based ordering
    // used everywhere else in this feature now
    .sort((a, b) => new Date(b.assignedAt ?? 0).getTime() - new Date(a.assignedAt ?? 0).getTime());

  return NextResponse.json({ schools });
}