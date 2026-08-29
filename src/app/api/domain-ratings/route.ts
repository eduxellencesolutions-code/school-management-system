import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

// POST /api/domain-ratings
// Body: { learnerId, termId, domainType: 'affective'|'psychomotor', traitName, rating }
export async function POST(request: Request) {
  const supabase = await createClient();

  const { user } = await getAuthenticatedUser(supabase);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { learnerId, termId, domainType, traitName, rating } = body;

  if (!learnerId || !termId || !domainType || !traitName || !rating) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!['affective', 'psychomotor'].includes(domainType)) {
    return NextResponse.json({ error: 'Invalid domainType' }, { status: 400 });
  }

  // Resolve learner's org through the learner record itself — never trust client-supplied org id
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
        p_feature_key: 'affective_psychomotor',
      });

    if (featureError) {
      return NextResponse.json({ error: 'Could not verify plan entitlement' }, { status: 500 });
    }

    if (!hasFeature) {
      return NextResponse.json(
        { error: 'Affective/Psychomotor tracking is not available on your current plan' },
        { status: 403 }
      );
    }
  }

  const { error: upsertError } = await supabase
    .from('domain_ratings')
    .upsert(
      {
        organization_id: learner.organization_id,
        learner_id: learnerId,
        term_id: termId,
        domain_type: domainType,
        trait_name: traitName,
        rating,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'learner_id,term_id,domain_type,trait_name' }
    );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// GET /api/domain-ratings?learnerId=...&termId=...
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const learnerId = searchParams.get('learnerId');
  const termId = searchParams.get('termId');

  if (!learnerId || !termId) {
    return NextResponse.json({ error: 'Missing learnerId or termId' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('domain_ratings')
    .select('domain_type, trait_name, rating, updated_at')
    .eq('learner_id', learnerId)
    .eq('term_id', termId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ratings: data });
}
