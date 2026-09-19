// FILE: src/app/(dashboard)/cohorts/[groupId]/register/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function registerLearnerCourses(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const groupId = formData.get('group_id') as string
  const learnerId = formData.get('learner_id') as string
  const sessionId = formData.get('session_id') as string
  const termId = formData.get('term_id') as string
  const selectedCourseIds = formData.getAll('course_ids') as string[]

  // FIX: fail loudly, up front, before attempting any writes — a cohort
  // with no session/term configured cannot register students at all.
  // This is the root-cause guard; the form should already prevent this
  // via /cohorts/new requiring both fields, but this action must not
  // trust that and silently corrupt data if it's ever bypassed.
  if (!sessionId || !termId) {
    redirect(`/cohorts/${groupId}/register?error=` + encodeURIComponent(
      'This cohort has no session/term configured. Set them on the cohort before registering students.'
    ))
  }

  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()
  const orgId = profile?.organization_id

  const { data: existing } = await supabase
    .from('course_registrations')
    .select('id, subject_id, status')
    .eq('learner_id', learnerId)
    .eq('term_id', termId)

  const existingBySubject = new Map((existing ?? []).map(r => [r.subject_id, r]))
  const errors: string[] = []

  for (const subjectId of selectedCourseIds) {
    const existingReg = existingBySubject.get(subjectId)
    if (!existingReg) {
      const { error } = await supabase.from('course_registrations').insert({
        organization_id: orgId, learner_id: learnerId, subject_id: subjectId,
        session_id: sessionId, term_id: termId, status: 'registered', registered_by: user!.id,
      })
      if (error) errors.push(error.message)
    } else if (existingReg.status === 'dropped') {
      const { error } = await supabase.from('course_registrations')
        .update({ status: 'registered', registered_by: user!.id, registered_at: new Date().toISOString() })
        .eq('id', existingReg.id)
      if (error) errors.push(error.message)
    }
  }

  for (const [subjectId, reg] of existingBySubject) {
    if (reg.status === 'registered' && !selectedCourseIds.includes(subjectId)) {
      const { error } = await supabase.from('course_registrations')
        .update({ status: 'dropped', dropped_by: user!.id, dropped_at: new Date().toISOString() })
        .eq('id', reg.id)
      if (error) errors.push(error.message)
    }
  }

  // FIX: only claim success if nothing actually failed.
  if (errors.length > 0) {
    redirect(`/cohorts/${groupId}/register?error=` + encodeURIComponent(
      `${errors.length} registration change(s) failed: ${errors.join('; ')}`
    ))
  }

  redirect(`/cohorts/${groupId}/register?success=` + encodeURIComponent('Registrations updated'))
}