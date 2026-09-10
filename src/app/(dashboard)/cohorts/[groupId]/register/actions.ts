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

  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()
  const orgId = profile?.organization_id

  const { data: existing } = await supabase
    .from('course_registrations')
    .select('id, subject_id, status')
    .eq('learner_id', learnerId)
    .eq('term_id', termId)

  const existingBySubject = new Map((existing ?? []).map(r => [r.subject_id, r]))

  // Register newly-checked courses (upsert-ish: insert if none exists,
  // reinstate if it was previously dropped).
  for (const subjectId of selectedCourseIds) {
    const existingReg = existingBySubject.get(subjectId)
    if (!existingReg) {
      await supabase.from('course_registrations').insert({
        organization_id: orgId, learner_id: learnerId, subject_id: subjectId,
        session_id: sessionId, term_id: termId, status: 'registered', registered_by: user!.id,
      })
    } else if (existingReg.status === 'dropped') {
      await supabase.from('course_registrations').update({ status: 'registered', registered_by: user!.id, registered_at: new Date().toISOString() }).eq('id', existingReg.id)
    }
  }

  // Drop courses that were previously registered but are now unchecked —
  // never hard-deleted, per spec section 15.
  for (const [subjectId, reg] of existingBySubject) {
    if (reg.status === 'registered' && !selectedCourseIds.includes(subjectId)) {
      await supabase.from('course_registrations').update({ status: 'dropped', dropped_by: user!.id, dropped_at: new Date().toISOString() }).eq('id', reg.id)
    }
  }

  redirect(`/cohorts/${groupId}/register?success=` + encodeURIComponent('Registrations updated'))
}