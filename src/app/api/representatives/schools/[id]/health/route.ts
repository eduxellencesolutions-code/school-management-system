// src/app/api/representatives/schools/[id]/health/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { health, note } = await request.json();
  if (!health) return NextResponse.json({ error: 'health is required' }, { status: 400 });

  const { error } = await supabase.rpc('set_school_relationship_health', {
    p_organization_id: id,
    p_health: health,
    p_note: note ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  return NextResponse.json({ success: true });
}