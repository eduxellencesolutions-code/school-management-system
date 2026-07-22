import { createClient } from '@/lib/supabase/server';
import { createAdminClient, generateAccessCode } from '@/lib/supabase/admin';
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

  // ✅ NEW: Check if this parent already has a real auth identity + access code.
  // If not (first time this parent record was created), set both up now.
  const { data: existingParent } = await supabase
    .from('parent_accounts')
    .select('auth_user_id, access_code')
    .eq('id', parentId)
    .single();

  if (existingParent && (!existingParent.auth_user_id || !existingParent.access_code)) {
    const admin = createAdminClient();

    let authUserId = existingParent.auth_user_id;

    if (!authUserId) {
      // Create the parent's real, permanent auth identity. They never see or use this
      // email/password directly — it exists so Supabase Auth and existing RLS work normally.
      const ghostEmail = `parent-${parentId}@parents.eduxellence.internal`;
      const { data: newAuthUser, error: createUserError } = await admin.auth.admin.createUser({
        email: ghostEmail,
        email_confirm: true,
        user_metadata: { is_parent_account: true, parent_account_id: parentId },
      });

      if (createUserError || !newAuthUser?.user) {
        return NextResponse.json(
          { error: `Parent linked, but failed to create parent authentication identity: ${createUserError?.message}` },
          { status: 500 }
        );
      }

      authUserId = newAuthUser.user.id;
    }

    let accessCode = existingParent.access_code;
    if (!accessCode) {
      // Ensure uniqueness — retry on the rare collision
      let attempts = 0;
      while (!accessCode && attempts < 5) {
        const candidate = generateAccessCode();
        const { data: clash } = await supabase
          .from('parent_accounts')
          .select('id')
          .eq('access_code', candidate)
          .maybeSingle();
        if (!clash) accessCode = candidate;
        attempts++;
      }
    }

    await supabase
      .from('parent_accounts')
      .update({ auth_user_id: authUserId, access_code: accessCode })
      .eq('id', parentId);
  }

  return NextResponse.json({ success: true, parentId });
}
