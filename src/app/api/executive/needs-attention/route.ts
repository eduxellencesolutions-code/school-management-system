// src/app/api/executive/needs-attention/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).single();
  if (!profile?.organization_id) return NextResponse.json({ error: 'No organization found' }, { status: 400 });
  const orgId = profile.organization_id;

  const [{ data: alerts }, { data: classHealth }, { data: movement }] = await Promise.all([
    supabase.rpc('get_attendance_alerts', { p_org_id: orgId }),
    supabase.rpc('get_class_health', { p_org_id: orgId }),
    supabase.rpc('get_student_movement', { p_org_id: orgId }),
  ]);

  const items: { severity: 'red' | 'amber' | 'yellow'; label: string; href: string }[] = [];

  const consecutive = alerts?.consecutive_5plus?.length ?? 0;
  if (consecutive > 0) {
    items.push({ severity: 'red', label: `${consecutive} student${consecutive !== 1 ? 's' : ''} absent for 5+ consecutive days`, href: '/executive#attendance' });
  }

  const lowFeeClasses = (classHealth ?? []).filter((c: any) => c.fees_collection_rate !== null && c.fees_collection_rate < 75);
  lowFeeClasses.forEach((c: any) => {
    items.push({ severity: 'amber', label: `${c.class_name} has only ${c.fees_collection_rate}% fee collection`, href: '/executive#class-health' });
  });

  const below80 = alerts?.below_80_percent?.length ?? 0;
  if (below80 > 0) {
    items.push({ severity: 'amber', label: `${below80} student${below80 !== 1 ? 's' : ''} have attendance below 80%`, href: '/executive#attendance' });
  }

  const withdrawn = movement?.withdrawn ?? 0;
  if (withdrawn > 0) {
    items.push({ severity: 'yellow', label: `${withdrawn} student${withdrawn !== 1 ? 's' : ''} withdrawn this term`, href: '/executive#movement' });
  }

  const repeated = alerts?.repeated_2weeks?.length ?? 0;
  if (repeated > 0) {
    items.push({ severity: 'yellow', label: `${repeated} student${repeated !== 1 ? 's' : ''} with repeated absence over the last 2 weeks`, href: '/executive#attendance' });
  }

  const severityOrder = { red: 0, amber: 1, yellow: 2 };
  items.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return NextResponse.json({ items });
}