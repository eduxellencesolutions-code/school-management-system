// FILE: src/app/(dashboard)/courses/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createCourse(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()
  if (!profile?.organization_id) redirect('/courses/new?error=' + encodeURIComponent('No organization found'))

  const groupId = formData.get('group_id') as string
  const name = formData.get('name') as string
  const code = (formData.get('code') as string) || null
  const creditUnit = Number(formData.get('credit_unit'))
  const courseType = (formData.get('course_type') as string) || 'core'
  const instructorId = (formData.get('instructor_id') as string) || null
  const prerequisiteSubjectId = (formData.get('prerequisite_subject_id') as string) || null
  const description = (formData.get('description') as string) || null

  const { data: template, error: templateError } = await supabase
    .from('assessment_templates')
    .insert({ organization_id: profile!.organization_id, name: `${name} — CA/Exam`, is_default: false, created_by: user!.id })
    .select('id').single()

  if (templateError || !template) redirect('/courses/new?error=' + encodeURIComponent(templateError?.message ?? 'Could not create assessment template'))

  const { error: componentError } = await supabase
    .from('assessment_components')
    .insert([
      { template_id: template!.id, name: 'CA', max_score: 30, sequence: 1 },
      { template_id: template!.id, name: 'Exam', max_score: 70, sequence: 2 },
    ])

  if (componentError) redirect('/courses/new?error=' + encodeURIComponent(componentError.message))

  const { error } = await supabase.from('subjects').insert({
    organization_id: profile!.organization_id,
    group_id: groupId, name, code,
    credit_unit: creditUnit, course_type: courseType,
    prerequisite_subject_id: prerequisiteSubjectId, description,
    template_id: template!.id,
    instructor_id: instructorId,
  })

  if (error) redirect('/courses/new?error=' + encodeURIComponent(error.message))
  redirect(`/courses?group_id=${groupId}&success=` + encodeURIComponent('Course created'))
}