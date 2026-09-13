import { supabase } from '../client'

export interface AnnouncementItem {
  id: string
  title: string
  body: string
  audience: string
  createdAt: string
  expiresAt: string | null
  isPlatformWide: boolean
}

export async function loadAnnouncements(orgId: string): Promise<AnnouncementItem[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, body, audience, created_at, expires_at, organization_id')
    .or(`organization_id.eq.${orgId},organization_id.is.null`)
    .order('created_at', { ascending: false })

  if (error) throw new Error('Could not load announcements.')

  return (data ?? []).map((a) => ({
    id: a.id, title: a.title, body: a.body, audience: a.audience,
    createdAt: a.created_at, expiresAt: a.expires_at, isPlatformWide: a.organization_id === null,
  }))
}

export async function createAnnouncement(params: {
  organizationId: string
  title: string
  body: string
  audience: 'all' | 'staff' | 'parents'
  createdBy: string
  expiresInDays?: number | null
}): Promise<void> {
  const expiresAt = params.expiresInDays
    ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null

  const { error } = await supabase.from('announcements').insert({
    organization_id: params.organizationId,
    title: params.title,
    body: params.body,
    audience: params.audience,
    created_by: params.createdBy,
    expires_at: expiresAt,
  })
  if (error) throw new Error('Could not post announcement. You may not have permission.')
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) throw new Error('Could not delete announcement. You may not have permission.')
}