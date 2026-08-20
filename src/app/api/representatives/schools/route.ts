// src/app/api/representatives/schools/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: rep } = await supabase
    .from('representatives')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!rep) return NextResponse.json({ error: 'You do not have representative access' }, { status: 403 });

  const { data: referrals, error } = await supabase
    .from('referrals')
    .select('organization_id, referred_at, qualified_at')
    .eq('representative_id', rep.id)
    .eq('status', 'qualified')
    .not('organization_id', 'is', null)
    .order('qualified_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orgIds = (referrals ?? []).map(r => r.organization_id) as string[];
  if (orgIds.length === 0) return NextResponse.json({ schools: [] });

  const [{ data: orgs }, { data: relationships }, { data: escalations }] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, name, address, principal_name, principal_title, contact_phone, contact_email, phone, email, subscription_plan, subscription_status, subscription_expires_at, created_at')
      .in('id', orgIds),
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
  const relMap = new Map((relationships ?? []).map(r => [r.organization_id, r]));
  const escalationCounts = new Map<string, number>();
  (escalations ?? []).forEach(t => {
    if (t.status === 'resolved' || t.status === 'closed') return;
    escalationCounts.set(t.organization_id, (escalationCounts.get(t.organization_id) ?? 0) + 1);
  });

  const schools = (referrals ?? [])
    .filter(r => r.organization_id && orgMap.has(r.organization_id))
    .map(r => {
      const org = orgMap.get(r.organization_id!)!;
      const rel = relMap.get(r.organization_id!);
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
        referredAt: r.referred_at,
        joinedAt: r.qualified_at,
        healthStatus: rel?.health_status ?? 'no_recent_contact',
        lastContactAt: rel?.last_contact_at ?? null,
        nextFollowUpAt: rel?.next_follow_up_at ?? null,
        followUpStatus: rel?.follow_up_status ?? 'none',
        openEscalations: escalationCounts.get(org.id) ?? 0,
      };
    });

  return NextResponse.json({ schools });
}