import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/promotion/rules — fetch this org's promotion policy (or defaults if none set)
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (userError || !userRow) {
    return NextResponse.json({ error: 'Could not resolve user profile' }, { status: 500 });
  }

  if (userRow.organization_id === null) {
    return NextResponse.json({ error: 'Promotion is not available for solo teacher accounts' }, { status: 403 });
  }

  if (userRow.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can manage promotion rules' }, { status: 403 });
  }

  const { data: hasFeature, error: featureError } = await supabase
    .rpc('org_has_feature', {
      p_org_id: userRow.organization_id,
      p_feature_key: 'promotion_wizard',
    });

  if (featureError) {
    return NextResponse.json({ error: 'Could not verify plan entitlement' }, { status: 500 });
  }

  if (!hasFeature) {
    return NextResponse.json(
      { error: 'Promotion wizard is not available on your current plan' },
      { status: 403 }
    );
  }

  const { data: rules, error: rulesError } = await supabase
    .from('promotion_rules')
    .select('*')
    .eq('organization_id', userRow.organization_id)
    .maybeSingle();

  if (rulesError) {
    return NextResponse.json({ error: rulesError.message }, { status: 500 });
  }

  // Sensible defaults if the org hasn't configured rules yet
  return NextResponse.json({
    rules: rules ?? {
      organization_id: userRow.organization_id,
      min_average: 50,
      max_failed_subjects: 2,
      min_attendance: 75,
      auto_promote_all: false,
    },
  });
}

// POST /api/promotion/rules — create or update this org's promotion policy
// Body: { minAverage, maxFailedSubjects, minAttendance, autoPromoteAll }
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (userError || !userRow) {
    return NextResponse.json({ error: 'Could not resolve user profile' }, { status: 500 });
  }

  if (userRow.organization_id === null) {
    return NextResponse.json({ error: 'Promotion is not available for solo teacher accounts' }, { status: 403 });
  }

  if (userRow.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can manage promotion rules' }, { status: 403 });
  }

  const { data: hasFeature, error: featureError } = await supabase
    .rpc('org_has_feature', {
      p_org_id: userRow.organization_id,
      p_feature_key: 'promotion_wizard',
    });

  if (featureError) {
    return NextResponse.json({ error: 'Could not verify plan entitlement' }, { status: 500 });
  }

  if (!hasFeature) {
    return NextResponse.json(
      { error: 'Promotion wizard is not available on your current plan' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { minAverage, maxFailedSubjects, minAttendance, autoPromoteAll } = body;

  const { error: upsertError } = await supabase
    .from('promotion_rules')
    .upsert(
      {
        organization_id: userRow.organization_id,
        min_average: minAverage ?? 50,
        max_failed_subjects: maxFailedSubjects ?? 2,
        min_attendance: minAttendance ?? 75,
        auto_promote_all: autoPromoteAll ?? false,
      },
      { onConflict: 'organization_id' }
    );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
