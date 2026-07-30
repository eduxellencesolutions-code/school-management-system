import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
  const { data: canViewSchools } = await supabase.rpc('has_platform_permission', { p_user_id: user.id, p_permission_key: 'schools.view' });
  if (!isSuperAdmin && !canViewSchools) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const [{ data: orgs }, { data: soloTeachers }, { data: reps }, { data: tickets }] = await Promise.all([
    supabase.from('organizations').select('id, name').ilike('name', `%${q}%`).limit(5),
    supabase.from('users').select('id, name, email').is('organization_id', null).or(`name.ilike.%${q}%,email.ilike.%${q}%`).limit(5),
    supabase.from('representatives').select('id, full_name, email, referral_code').or(`full_name.ilike.%${q}%,email.ilike.%${q}%,referral_code.ilike.%${q}%`).limit(5),
    supabase.from('support_tickets').select('id, subject').ilike('subject', `%${q}%`).limit(5),
  ]);

  const results = [
    ...(orgs ?? []).map(o => ({ type: 'school', id: o.id, label: o.name, href: `/schools/${o.id}` })),
    ...(soloTeachers ?? []).map(t => ({ type: 'solo_teacher', id: t.id, label: `${t.name} (${t.email})`, href: `/solo-teachers/${t.id}` })),
    ...(reps ?? []).map(r => ({ type: 'representative', id: r.id, label: `${r.full_name} — ${r.referral_code}`, href: `/representatives?highlight=${r.id}` })),
    ...(tickets ?? []).map(t => ({ type: 'ticket', id: t.id, label: t.subject, href: `/support?ticket=${t.id}` })),
  ];

  return NextResponse.json({ results });
}