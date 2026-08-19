import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { path } = await request.json()
  if (!path || typeof path !== 'string') {
    return NextResponse.json({ error: 'path is required' }, { status: 400 })
  }
  // Defense in depth — the storage RLS policy already restricts uploads to
  // the caller's own folder, but reject obviously mismatched paths here too.
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'Invalid photo path' }, { status: 403 })
  }

  const { error } = await supabase.rpc('submit_representative_passport', { p_photo_url: path })
  if (error) return NextResponse.json({ error: error.message }, { status: 422 })
  return NextResponse.json({ success: true })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: rep } = await supabase
    .from('representatives')
    .select('photo_url, photo_status, photo_rejection_reason')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!rep) return NextResponse.json({ error: 'You do not have representative access' }, { status: 403 })

  let signedUrl: string | null = null
  if (rep.photo_url) {
    const { data } = await supabase.storage
      .from('representative-passports')
      .createSignedUrl(rep.photo_url, 300)
    signedUrl = data?.signedUrl ?? null
  }

  return NextResponse.json({
    photoStatus: rep.photo_status,
    rejectionReason: rep.photo_rejection_reason,
    signedUrl,
  })
}