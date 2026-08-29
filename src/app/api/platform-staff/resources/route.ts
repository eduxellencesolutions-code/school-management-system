import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function GET() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: canManage } = await supabase.rpc('has_platform_permission', { p_user_id: user.id, p_permission_key: 'representatives.view' })
  if (!canManage) return NextResponse.json({ error: 'You do not have permission to manage resources' }, { status: 403 })

  const { data: resources, error } = await supabase
    .from('representative_resources')
    .select('*, resource_categories(label)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: downloadCounts } = await supabase
    .from('representative_resource_downloads')
    .select('resource_id')
  const counts: Record<string, number> = {}
  for (const d of downloadCounts ?? []) counts[d.resource_id] = (counts[d.resource_id] ?? 0) + 1

  return NextResponse.json({
    resources: (resources ?? []).map(r => ({ ...r, downloadCount: counts[r.id] ?? 0 })),
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: canManage } = await supabase.rpc('has_platform_permission', { p_user_id: user.id, p_permission_key: 'representatives.view' })
  if (!canManage) return NextResponse.json({ error: 'You do not have permission to manage resources' }, { status: 403 })

  const body = await request.json()
  const {
    title, description, categoryId, resourceType, storagePath, externalUrl,
    fileSizeBytes, mimeType, product, campaignKey, version, effectiveDate,
    expiryDate, visibility, visibleGroup, isFeatured, isImportant,
  } = body

  if (!title || !resourceType) {
    return NextResponse.json({ error: 'title and resourceType are required' }, { status: 400 })
  }
  if (resourceType === 'link' && !externalUrl) {
    return NextResponse.json({ error: 'externalUrl is required for link resources' }, { status: 400 })
  }
  if (resourceType !== 'link' && !storagePath) {
    return NextResponse.json({ error: 'storagePath is required for uploaded resources' }, { status: 400 })
  }

  const { data: resource, error } = await supabase
    .from('representative_resources')
    .insert({
      title, description: description ?? null, category_id: categoryId ?? null,
      resource_type: resourceType, storage_path: storagePath ?? null, external_url: externalUrl ?? null,
      file_size_bytes: fileSizeBytes ?? null, mime_type: mimeType ?? null,
      product: product ?? null, campaign_key: campaignKey ?? null, version: version ?? null,
      effective_date: effectiveDate ?? null, expiry_date: expiryDate ?? null,
      visibility: visibility ?? 'all', visible_group: visibleGroup ?? null,
      is_featured: !!isFeatured, is_important: !!isImportant,
      status: 'draft', created_by: user.id, updated_by: user.id,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, id: resource.id })
}