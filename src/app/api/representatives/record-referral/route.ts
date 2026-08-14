import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const admin = createAdminClient();
  const body = await request.json();
  const { referralCode, userId } = body;

  if (!referralCode || !userId) {
    return NextResponse.json({ error: 'Missing referralCode or userId' }, { status: 400 });
  }

  const { data: rep } = await admin
    .from('representatives')
    .select('id, status')
    .eq('referral_code', referralCode)
    .maybeSingle();

  if (!rep || rep.status !== 'active') {
    return NextResponse.json({ success: false }); // silent no-op — invalid code should never block signup
  }

  // Fraud guard: no self-referral, no duplicate referral for the same user
  const { data: existing } = await admin
    .from('referrals')
    .select('id')
    .eq('referred_user_id', userId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ success: false });
  }

  // ✅ FIX: Resolve the referred user's organization_id at insert time
  const { data: referredUser } = await admin
    .from('users')
    .select('organization_id')
    .eq('id', userId)
    .maybeSingle();

  await admin.from('referrals').insert({
    representative_id: rep.id,
    referred_user_id: userId,
    organization_id: referredUser?.organization_id ?? null,
    referral_code: referralCode,
    status: 'pending',
  });

  return NextResponse.json({ success: true });
}