import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// POST /api/parents/access
// Body: { code }
// Public endpoint — no auth required to call this, since this IS the login mechanism.
// Must use the admin client: no one is authenticated yet, so RLS would block this lookup.
export async function POST(request: Request) {
  const admin = createAdminClient();

  const body = await request.json();
  const code = (body.code ?? '').toString().trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ error: 'Please enter an access code' }, { status: 400 });
  }

  const { data: parent, error: parentError } = await admin
    .from('parent_accounts')
    .select('id, full_name, auth_user_id, access_code_active')
    .eq('access_code', code)
    .maybeSingle();

  if (parentError || !parent) {
    return NextResponse.json({ error: 'Invalid access code' }, { status: 404 });
  }

  if (!parent.access_code_active) {
    return NextResponse.json(
      { error: 'This access code has been disabled. Please contact your school for a new one.' },
      { status: 403 }
    );
  }

  if (!parent.auth_user_id) {
    return NextResponse.json(
      { error: 'This parent account is not fully set up yet. Please contact your school.' },
      { status: 500 }
    );
  }

  const { data: authUser, error: authLookupError } = await admin.auth.admin.getUserById(parent.auth_user_id);

  if (authLookupError || !authUser?.user?.email) {
    return NextResponse.json({ error: 'Could not resolve parent identity' }, { status: 500 });
  }

  // ✅ FIX: Generate magic link without redirectTo, use token_hash manually
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: authUser.user.email,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.json({ error: 'Could not generate sign-in session' }, { status: 500 });
  }

  // Build our own confirm URL using the token_hash, rather than trusting Supabase's
  // action_link — that link uses implicit/hash-fragment flow which our server route
  // can't read. This gives us a query-param URL our /auth/confirm route can process.
  const confirmUrl = `https://results.eduxellence.org/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=magiclink`;

  return NextResponse.json({
    success: true,
    actionLink: confirmUrl,
    parentName: parent.full_name,
  });
}
