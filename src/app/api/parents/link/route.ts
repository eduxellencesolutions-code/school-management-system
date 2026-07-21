import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/parents/link
// Body: { learnerId, parentFullName, parentEmail, parentPhone }
// Called from the admission/student-creation flow to auto-link or create a parent account.
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { learnerId, parentFullName, parentEmail, parentPhone } = body;

  if (!learnerId || !parentFullName || (!parentEmail && !parentPhone)) {
    return NextResponse.json(
      { error: 'learnerId, parentFullName, and at least one of parentEmail/parentPhone are required' },
      { status: 400 }
    );
  }

  // Resolve learner's org to check parent_portal entitlement
  const { data: learner, error: learnerError } = await supabase
    .from('learners')
    .select('organization_id')
    .eq('id', learnerId)
    .single();

  if (learnerError || !learner) {
    return NextResponse.json({ error: 'Learner not found' }, { status: 404 });
  }

  const isSolo = learner.organization_id === null;

  if (!isSolo) {
    const { data: hasFeature, error: featureError } = await supabase
      .rpc('org_has_feature', {
        p_org_id: learner.organization_id,
        p_feature_key: 'parent_portal',
      });

    if (featureError) {
      return NextResponse.json({ error: 'Could not verify plan entitlement' }, { status: 500 });
    }

    if (!hasFeature) {
      return NextResponse.json(
        { error: 'Parent portal is not available on your current plan' },
        { status: 403 }
      );
    }
  }

  // Delegate to the DB function: finds existing parent by email/phone, or creates new, then links
  const { data: parentId, error: linkError } = await supabase
    .rpc('link_or_create_parent', {
      p_full_name: parentFullName,
      p_email: parentEmail ?? null,
      p_phone: parentPhone ?? null,
      p_learner_id: learnerId,
    });

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, parentId });
}
