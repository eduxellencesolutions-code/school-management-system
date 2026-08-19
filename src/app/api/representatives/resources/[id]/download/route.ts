import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: rep } = await supabase
    .from('representatives').select('id').eq('user_id', user.id).maybeSingle()
  if (!rep) return NextResponse.json({ error: 'You do not have representative access' }, { status: 403 })

  const { data: resource } = await supabase
    .from('representative_resources').select('storage_path, external_url, status').eq('id', id).maybeSingle()
  if (!resource || resource.status !== 'published') {
    return NextResponse.json({ error: 'Resource not found or not available' }, { status: 404 })
  }

  await supabase.from('representative_resource_downloads').insert({ resource_id: id, representative_id: rep.id })

  if (resource.external_url) {
    return NextResponse.json({ url: resource.external_url })
  }

  const { data: signed, error: signError } = await supabase.storage
    .from('representative-resources')
    .createSignedUrl(resource.storage_path!, 300, { download: true })
  if (signError || !signed) return NextResponse.json({ error: 'Could not generate download link' }, { status: 500 })

  return NextResponse.json({ url: signed.signedUrl })
}