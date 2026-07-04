'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createTemplate(formData: FormData) {
  console.log('=== CREATE TEMPLATE STARTED ===')
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.log('No user found, redirecting to login')
    redirect('/login')
  }
  console.log('User ID:', user.id)

  const { data: profile } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  console.log('Profile:', profile)

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const isDefault = formData.get('is_default') === 'on'
  console.log('Form data - name:', name, 'isDefault:', isDefault)

  // Parse components from form
  const componentNames  = formData.getAll('component_name') as string[]
  const componentScores = formData.getAll('component_max_score') as string[]
  const componentPasses = formData.getAll('component_pass_mark') as string[]
  console.log('Components - names:', componentNames, 'scores:', componentScores)

  if (!name?.trim()) {
    console.log('Template name is empty, returning')
    return
  }

  // If setting as default, unset others
  if (isDefault && profile?.organization_id) {
    console.log('Unsetting other defaults for organization:', profile.organization_id)
    await supabase
      .from('assessment_templates')
      .update({ is_default: false })
      .eq('organization_id', profile.organization_id)
  }

  // Build the insert data based on user type
  const insertData: any = {
    name: name.trim(),
    description: description?.trim() || null,
    is_default: isDefault,
    metadata: {},
  }

  // If user belongs to an organization, use organization_id
  // Otherwise, use instructor_id for individual teachers
  if (profile?.organization_id) {
    insertData.organization_id = profile.organization_id
    console.log('Inserting for institution with organization_id:', profile.organization_id)
  } else {
    insertData.instructor_id = user.id
    console.log('Inserting for individual teacher with instructor_id:', user.id)
  }

  console.log('Final insert data:', insertData)

  const { data: template, error } = await supabase
    .from('assessment_templates')
    .insert(insertData)
    .select('id')
    .single()

  if (error) {
    console.error('Template creation error:', error)
    return
  }

  if (!template) {
    console.error('No template returned from insert')
    return
  }

  console.log('Template created with ID:', template.id)

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

  console.log('Components to insert:', components)

  if (components.length > 0) {
    const { error: compError } = await supabase.from('assessment_components').insert(components)
    if (compError) {
      console.error('Component creation error:', compError)
      // Rollback: delete the template if components fail
      await supabase.from('assessment_templates').delete().eq('id', template.id)
      console.log('Rolled back: deleted template due to component error')
      return
    }
    console.log('Components inserted successfully')
  }

  console.log('=== CREATE TEMPLATE COMPLETED SUCCESSFULLY ===')
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

  if (isDefault && profile?.organization_id) {
    await supabase
      .from('assessment_templates')
      .update({ is_default: false })
      .eq('organization_id', profile.organization_id)
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
