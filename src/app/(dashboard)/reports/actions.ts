'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function generateReport(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const groupId = formData.get('group_id') as string
  const type = formData.get('type') as string // 'broadsheet' or 'result_cards'

  if (!groupId || !type) return

  const { data: profile } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()

  // Check if a pending/completed report already exists for this group+type
  const { data: existing } = await supabase
    .from('reports')
    .select('id, status')
    .eq('group_id', groupId)
    .eq('type', type)
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (existing?.status === 'pending') {
    // Already generating
    revalidatePath('/reports')
    redirect('/reports')
  }

  // Create a new report record with 'pending' status
  await supabase.from('reports').insert({
    organization_id: profile?.organization_id,
    group_id: groupId,
    type,
    status: 'pending',
    filters: {},
    created_by: user.id,
  })

  revalidatePath('/reports')
  revalidatePath('/dashboard')
  redirect('/reports')
}

export async function markReportReady(reportId: string) {
  const supabase = await createClient()
  await supabase
    .from('reports')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', reportId)

  revalidatePath('/reports')
  revalidatePath('/dashboard')
}

export async function deleteReport(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  if (!id) return

  await supabase.from('reports').delete().eq('id', id)

  revalidatePath('/reports')
  revalidatePath('/dashboard')
  redirect('/reports')
}
