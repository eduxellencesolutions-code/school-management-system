'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createTemplate(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const isDefault = formData.get('is_default') === 'on'

  // Parse components from form
  const componentNames  = formData.getAll('component_name') as string[]
  const componentScores = formData.getAll('component_max_score') as string[]
  const componentPasses = formData.getAll('component_pass_mark') as string[]

  if (!name?.trim()) return

  // If setting as default, unset others
  if (isDefault) {
    await supabase
      .from('assessment_templates')
      .update({ is_default: false })
      .eq('organization_id', profile?.organization_id)
  }

  const { data: template, error } = await supabase
    .from('assessment_templates')
    .insert({
      organization_id: profile?.organization_id,
      name: name.trim(),
      description: description?.trim() || null,
      is_default: isDefault,
      metadata: {},
    })
    .select('id')
    .single()

  if (error || !template) return

  // Insert components
  const components = componentNames
    .map((n, i) => ({
      template_id: template.id,
      name: n.trim(),
      max_score: parseFloat(componentScores[i] ?? '0') || 0,
      pass_mark: parseFloat(componentPasses[i] ?? '0') || 0,
      weight: 1,
      sequence: i + 1,
      is_cumulative: false,
      metadata: {},
    }))
    .filter(c => c.name)

  if (components.length > 0) {
    await supabase.from('assessment_components').insert(components)
  }

  revalidatePath('/settings/templates')
  redirect('/settings/templates')
}

export async function updateTemplate(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()

  const id          = formData.get('id') as string
  const name        = formData.get('name') as string
  const description = formData.get('description') as string
  const isDefault   = formData.get('is_default') === 'on'

  const componentNames  = formData.getAll('component_name') as string[]
  const componentScores = formData.getAll('component_max_score') as string[]
  const componentPasses = formData.getAll('component_pass_mark') as string[]

  if (!name?.trim() || !id) return

  if (isDefault) {
    await supabase
      .from('assessment_templates')
      .update({ is_default: false })
      .eq('organization_id', profile?.organization_id)
  }

  await supabase
    .from('assessment_templates')
    .update({
      name: name.trim(),
      description: description?.trim() || null,
      is_default: isDefault,
    })
    .eq('id', id)

  // Delete existing components and re-insert
  await supabase.from('assessment_components').delete().eq('template_id', id)

  const components = componentNames
    .map((n, i) => ({
      template_id: id,
      name: n.trim(),
      max_score: parseFloat(componentScores[i] ?? '0') || 0,
      pass_mark: parseFloat(componentPasses[i] ?? '0') || 0,
      weight: 1,
      sequence: i + 1,
      is_cumulative: false,
      metadata: {},
    }))
    .filter(c => c.name)

  if (components.length > 0) {
    await supabase.from('assessment_components').insert(components)
  }

  revalidatePath('/settings/templates')
  redirect('/settings/templates')
}

export async function deleteTemplate(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  if (!id) return

  await supabase.from('assessment_components').delete().eq('template_id', id)
  await supabase.from('assessment_templates').delete().eq('id', id)

  revalidatePath('/settings/templates')
  redirect('/settings/templates')
}
