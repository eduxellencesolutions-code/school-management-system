import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: canManage } = await supabase.rpc('has_platform_permission', { p_user_id: user.id, p_permission_key: 'representatives.view' })
  if (!canManage) return NextResponse.json({ error: 'You do not have permission to manage resources' }, { status: 403 })

  const { data: old, error: oldError } = await supabase
    .from('representative_resources').select('*').eq('id', id).single()
  if (oldError || !old) return NextResponse.json({ error: 'Original resource not found' }, { status: 404 })

  const body = await request.json()
  const { storagePath, externalUrl, fileSizeBytes, mimeType, version, effectiveDate } = body
  if (!storagePath && !externalUrl) {
    return NextResponse.json({ error: 'storagePath or externalUrl is required' }, { status: 400 })
  }

  const { data: created, error: createError } = await supabase
    .from('representative_resources')
    .insert({
      title: old.title, description: old.description, category_id: old.category_id,
      resource_type: old.resource_type, storage_path: storagePath ?? null, external_url: externalUrl ?? old.external_url,
      file_size_bytes: fileSizeBytes ?? null, mime_type: mimeType ?? old.mime_type,
      product: old.product, campaign_key: old.campaign_key, version: version ?? old.version,
      effective_date: effectiveDate ?? null, expiry_date: old.expiry_date,
      visibility: old.visibility, visible_group: old.visible_group,
      is_featured: old.is_featured, is_important: old.is_important,
      replaces_resource_id: old.id, status: 'draft', created_by: user.id, updated_by: user.id,
    })
    .select('id')
    .single()
  if (createError) return NextResponse.json({ error: createError.message }, { status: 500 })

  const { error: archiveError } = await supabase
    .from('representative_resources')
    .update({ status: 'archived', updated_by: user.id, updated_at: new Date().toISOString() })
    .eq('id', old.id)
  if (archiveError) return NextResponse.json({ error: archiveError.message }, { status: 500 })

  return NextResponse.json({ success: true, newResourceId: created.id })
}