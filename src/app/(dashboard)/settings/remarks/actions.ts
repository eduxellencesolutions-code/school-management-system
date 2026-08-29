'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

async function checkAccess() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()

  const orgId = profile?.organization_id
  const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'

  // Assigned (non-admin) institution teachers cannot manage remark templates
  if (orgId && !isAdmin) redirect('/settings/remarks')

  return { user, orgId, isAdmin }
}

export async function createRemarkTemplate(formData: FormData) {
  const { user, orgId } = await checkAccess()
  const supabase = await createClient()

  const type = formData.get('type') as string
  const min_score = Number(formData.get('min_score'))
  const max_score = Number(formData.get('max_score'))
  const remark_text = formData.get('remark_text') as string

  if (!type || !remark_text.trim() || isNaN(min_score) || isNaN(max_score)) {
    redirect('/settings/remarks/new?error=invalid')
  }
  if (min_score > max_score) {
    redirect('/settings/remarks/new?error=range')
  }

  const { error } = await supabase.from('remark_templates').insert({
    organization_id: orgId ?? null,
    instructor_id: orgId ? null : user.id,
    type,
    min_score,
    max_score,
    remark_text: remark_text.trim(),
  })

  if (error) {
    console.error('Error creating remark template:', error)
    redirect('/settings/remarks/new?error=save_failed')
  }

  revalidatePath('/settings/remarks')
  redirect('/settings/remarks?success=created')
}

export async function updateRemarkTemplate(formData: FormData) {
  await checkAccess()
  const supabase = await createClient()

  const id = formData.get('id') as string
  const type = formData.get('type') as string
  const min_score = Number(formData.get('min_score'))
  const max_score = Number(formData.get('max_score'))
  const remark_text = formData.get('remark_text') as string

  if (!id) redirect('/settings/remarks?error=no_id')
  if (min_score > max_score) redirect(`/settings/remarks/${id}?error=range`)

  const { error } = await supabase
    .from('remark_templates')
    .update({ type, min_score, max_score, remark_text: remark_text.trim() })
    .eq('id', id)

  if (error) {
    console.error('Error updating remark template:', error)
    redirect(`/settings/remarks/${id}?error=save_failed`)
  }

  revalidatePath('/settings/remarks')
  redirect('/settings/remarks?success=updated')
}

export async function deleteRemarkTemplate(formData: FormData) {
  await checkAccess()
  const supabase = await createClient()

  const id = formData.get('id') as string
  if (!id) return

  const { error } = await supabase.from('remark_templates').delete().eq('id', id)
  if (error) console.error('Error deleting remark template:', error)

  revalidatePath('/settings/remarks')
}
