'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireActiveSubscription } from '@/lib/subscription/checkAccess'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function generateReport(formData: FormData) {
  try {
    const supabase = await createClient()
    const { user } = await getAuthenticatedUser(supabase)
    if (!user) throw new Error('You must be logged in to generate reports')

    const groupId = formData.get('group_id') as string
    const type = formData.get('type') as string
    const termIdOverride = formData.get('term_id') as string | null // solo teacher may override

    if (!groupId) throw new Error('Class is required')
    if (!type) throw new Error('Report type is required')

    const { data: profile } = await supabase
      .from('users').select('organization_id, role').eq('id', user.id).single()
    if (!profile) throw new Error('User profile not found')

    // ✅ Subscription gate — expired accounts cannot generate new reports
    const { allowed, message } = await requireActiveSubscription(supabase, user.id)
    if (!allowed) throw new Error(message)

    // ✅ Explicit authorization check — only admin, solo (own class), or the CLASS TEACHER may generate
    const isAdmin = profile.role === 'admin' || profile.role === 'school_admin'
    const isSolo = !profile.organization_id

    if (!isAdmin && !isSolo) {
      const { data: assignment } = await supabase
        .from('teacher_assignments')
        .select('id')
        .eq('teacher_id', user.id)
        .eq('class_id', groupId)
        .eq('role', 'class_teacher')
        .maybeSingle()

      if (!assignment) {
        throw new Error('Only the class teacher can generate a report for this class')
      }
    }

    if (isSolo) {
      const { data: ownGroup } = await supabase
        .from('groups').select('id').eq('id', groupId).eq('instructor_id', user.id).maybeSingle()
      if (!ownGroup) throw new Error('You can only generate reports for your own classes')
    }

    // Determine the term: institution uses org's current_term_id (no override),
    // solo teacher uses their own current_term_id unless they picked a different one
    let termId: string | null = null
    if (profile.organization_id) {
      const { data: org } = await supabase
        .from('organizations').select('current_term_id').eq('id', profile.organization_id).single()
      termId = org?.current_term_id ?? null
      if (!termId) throw new Error('Your school has not set a current term yet. Ask your administrator to set one in Settings → Academic Periods.')
    } else {
      termId = termIdOverride || null
      if (!termId) {
        const { data: userRow } = await supabase
          .from('users').select('current_term_id').eq('id', user.id).single()
        termId = userRow?.current_term_id ?? null
      }
      if (!termId) throw new Error('Please select a term, or set a default term in Settings → Academic Periods.')
    }

    // ✅ FIX: Fetch term name and session name
    const { data: termRow } = await supabase
      .from('terms')
      .select('name, session_id, session:academic_sessions(name)')
      .eq('id', termId)
      .single()
    
    const sessionId = termRow?.session_id ?? null
    const termName = termRow?.name ?? ''
    const sessionName = (termRow?.session as any)?.name ?? ''

    // ✅ FIX: Pass termName and sessionName to generateReportData
    const reportData = await generateReportData(groupId, supabase, termName, sessionName)

    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert({
        organization_id: profile.organization_id,
        group_id: groupId,
        term_id: termId,
        session_id: sessionId,
        type,
        status: 'ready',
        report_status: 'draft',
        completed_at: new Date().toISOString(),
        filters: {},
        created_by: user.id,
        report_data: reportData,
      })
      .select()
      .single()

    // ✅ FIX: Detailed error logging
    if (insertError) {
      console.error('Report insert error:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
      })
      throw new Error(insertError.message || 'Failed to save report')
    }

    revalidatePath('/reports')
    revalidatePath('/dashboard')

    return { success: true, reportId: report.id }
  } catch (error) {
    console.error('Generate report error:', error)
    return { success: false, message: error instanceof Error ? error.message : 'Failed to generate report' }
  }
}

// ✅ FIX: Updated to accept termName and sessionName
async function generateReportData(groupId: string, supabase: any, termName: string, sessionName: string) {
  const { data: learners } = await supabase
    .from('learners')
    .select('id, first_name, last_name, admission_number')
    .eq('group_id', groupId).eq('is_active', true).order('last_name')

  if (!learners?.length) throw new Error('No learners found in this class')

  // ✅ Each subject uses its OWN assigned template — no single template picker
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name, code, template_id')
    .eq('group_id', groupId).eq('is_active', true).order('name')

  if (!subjects?.length) throw new Error('No subjects found for this class')

  const missingTemplate = subjects.filter((s: any) => !s.template_id)
  if (missingTemplate.length > 0) {
    throw new Error(`These subjects have no assessment template assigned: ${missingTemplate.map((s: any) => s.name).join(', ')}. Assign one in Settings → Subjects first.`)
  }

  // Fetch components for every distinct template used across subjects
  const templateIds = [...new Set(subjects.map((s: any) => s.template_id))]
  const { data: components } = await supabase
    .from('assessment_components')
    .select('id, name, max_score, template_id, sequence')
    .in('template_id', templateIds)
    .order('sequence')

  if (!components?.length) throw new Error('No assessment components found for the assigned templates')

  const { data: gradingSystem } = await supabase
    .from('grading_systems')
    .select('*')
    .order('min_score', { ascending: false })

  const grades = gradingSystem && gradingSystem.length > 0
    ? gradingSystem.map((g: any) => ({ min: g.min_score, max: g.max_score, grade: g.grade_letter, remark: g.remark || '' }))
    : [
        { min: 70, max: 100, grade: 'A', remark: 'Excellent' },
        { min: 60, max: 69,  grade: 'B', remark: 'Very Good' },
        { min: 50, max: 59,  grade: 'C', remark: 'Good' },
        { min: 45, max: 49,  grade: 'D', remark: 'Pass' },
        { min: 40, max: 44,  grade: 'E', remark: 'Below Pass' },
        { min: 0,  max: 39,  grade: 'F', remark: 'Fail' },
      ]

  const getGrade = (percentage: number) => {
    for (const g of grades) {
      if (percentage >= g.min && percentage <= g.max) return { grade: g.grade, remark: g.remark || '' }
    }
    return { grade: 'F', remark: 'Fail' }
  }

  // Components grouped per subject, based on that subject's OWN template
  const subjectComponentMap: Record<string, { id: string; name: string; max_score: number }[]> = {}
  subjects.forEach((subject: any) => {
    const comps = components.filter((c: any) => c.template_id === subject.template_id)
    subjectComponentMap[subject.id] = comps.map((c: any) => ({ id: c.id, name: c.name, max_score: c.max_score }))
  })

  const subjectMaxScore: Record<string, number> = {}
  subjects.forEach((subject: any) => {
    const comps = subjectComponentMap[subject.id] || []
    subjectMaxScore[subject.id] = comps.length > 0 ? comps.reduce((sum: number, c: any) => sum + c.max_score, 0) : 100
  })

  const learnerIds = learners.map((l: any) => l.id)
  const { data: scores } = await supabase
    .from('scores')
    .select('learner_id, subject_id, component_id, score')
    .in('learner_id', learnerIds)

  const reportData = learners.map((learner: any) => {
    const learnerScores = scores?.filter((s: any) => s.learner_id === learner.id) || []
    const subjectTotals: Record<string, number> = {}
    let overallTotal = 0

    const subjectDetails = subjects.map((subject: any) => {
      const subjectScoreData = learnerScores.filter((s: any) => s.subject_id === subject.id)
      const total = subjectScoreData.reduce((sum: number, s: any) => sum + (s.score || 0), 0)
      subjectTotals[subject.id] = total
      overallTotal += total

      const comps = subjectComponentMap[subject.id] || []
      const componentScores = comps.map((comp: any) => {
        const scoreEntry = subjectScoreData.find((s: any) => s.component_id === comp.id)
        const score = scoreEntry?.score ?? 0
        return {
          name: comp.name,
          score,
          max_score: comp.max_score,
          weight: comp.max_score,
          percentage: comp.max_score > 0 ? Math.round((score / comp.max_score) * 1000) / 10 : 0,
          position: null,
          teacher_comment: null,
        }
      })

      const maxScore = subjectMaxScore[subject.id] || 100
      const percentage = maxScore > 0 ? (total / maxScore) * 100 : 0
      const gradeResult = getGrade(percentage)

      return {
        subject_id: subject.id,
        subject_name: subject.name,
        total,
        max_score: maxScore,
        percentage: Math.round(percentage * 10) / 10,
        grade: gradeResult.grade,
        remark: gradeResult.remark,
        component_scores: componentScores,
      }
    })

    const overallMaxScore = subjects.reduce((sum: number, s: any) => sum + subjectMaxScore[s.id], 0)
    const average = subjects.length > 0 ? overallTotal / subjects.length : 0
    const percentage = overallMaxScore > 0 ? (overallTotal / overallMaxScore) * 100 : 0
    const overallGradeResult = getGrade(percentage)

    return {
      learner_id: learner.id,
      first_name: learner.first_name,
      last_name: learner.last_name,
      admission_number: learner.admission_number,
      subject_totals: subjectTotals,
      subject_details: subjectDetails,
      overall_total: overallTotal,
      average: Math.round(average * 10) / 10,
      percentage: Math.round(percentage * 10) / 10,
      grade: overallGradeResult.grade,
      remark: overallGradeResult.remark,
      position: 0,
    }
  })

  const sorted = [...reportData].sort((a, b) => b.overall_total - a.overall_total)
  sorted.forEach((item, index) => {
    item.position = index > 0 && item.overall_total === sorted[index - 1].overall_total
      ? sorted[index - 1].position
      : index + 1
  })

  const sortedByPosition = [...reportData].sort((a, b) => a.position - b.position)

  // ✅ FIX: Return object now includes term_name and session_name
  return {
    learners: sortedByPosition,
    subjects: subjects.map((s: any) => ({ id: s.id, name: s.name, code: s.code, template_id: s.template_id })),
    grading_system: grades,
    generated_at: new Date().toISOString(),
    term_name: termName,
    session_name: sessionName,
    summary: {
      total_learners: learners.length,
      total_subjects: subjects.length,
    },
  }
}

export async function markReportReady(reportId: string) {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) throw new Error('Unauthorized')

  await supabase.from('reports')
    .update({ status: 'ready', completed_at: new Date().toISOString() })
    .eq('id', reportId)

  revalidatePath('/reports')
  revalidatePath('/dashboard')
}

export async function deleteReport(formData: FormData): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await createClient()
    const { user } = await getAuthenticatedUser(supabase)
    if (!user) return { success: false, message: 'You must be logged in to delete reports' }

    const id = formData.get('id') as string
    if (!id) return { success: false, message: 'Report ID is required' }

    const { data: existing, error: checkError } = await supabase
      .from('reports').select('id, created_by, status').eq('id', id).single()

    if (checkError || !existing) return { success: false, message: 'Report not found' }
    if (existing.created_by !== user.id) return { success: false, message: 'You do not have permission to delete this report' }

    const { error: deleteError } = await supabase.from('reports').delete().eq('id', id)
    if (deleteError) return { success: false, message: 'Failed to delete report' }

    revalidatePath('/reports')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Unexpected error in deleteReport:', error)
    return { success: false, message: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function getReport(id: string) {
  try {
    const supabase = await createClient()
    const { user } = await getAuthenticatedUser(supabase)
    if (!user) throw new Error('Unauthorized')

    console.log('Fetching report:', id)

    const { data: report, error } = await supabase
      .from('reports')
      .select(`*, group:groups(id, name, code), term:terms(id, name)`)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching report:', error)
      throw new Error('Report not found')
    }
    if (!report) {
      console.error('Report not found for ID:', id)
      throw new Error('Report not found')
    }

    console.log('Report fetched successfully:', report.id)
    return report
  } catch (error) {
    console.error('getReport error:', error)
    throw error
  }
}

// ─── TRASH FUNCTIONS ───────────────────────────────────────────────

// Restore report from trash
export async function restoreReport(formData: FormData) {
  const reportId = formData.get('id') as string
  if (!reportId) {
    redirect('/reports/trash?error=missing_id')
  }

  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'
  const isSolo = !profile?.organization_id

  if (!isAdmin && !isSolo) {
    redirect('/reports/trash?error=unauthorized')
  }

  // Verify the report exists and belongs to this user/organization
  let query = supabase
    .from('reports')
    .select('id')
    .eq('id', reportId)
    .eq('deleted', true)

  if (profile?.organization_id) {
    query = query.eq('organization_id', profile.organization_id)
  } else {
    query = query.eq('created_by', user.id)
  }

  const { data: existingReport, error: checkError } = await query

  if (checkError || !existingReport || existingReport.length === 0) {
    redirect('/reports/trash?error=not_found')
  }

  // Restore the report
  const { error } = await supabase
    .from('reports')
    .update({ 
      deleted: false, 
      deleted_by: null, 
      deleted_at: null 
    })
    .eq('id', reportId)

  if (error) {
    console.error('Error restoring report:', error)
    redirect('/reports/trash?error=failed')
  }

  revalidatePath('/reports')
  revalidatePath('/reports/trash')
  redirect('/reports/trash?success=restored')
}

// Empty trash - permanently delete all soft-deleted reports
export async function emptyTrash() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'
  const isSolo = !profile?.organization_id

  if (!isAdmin && !isSolo) {
    redirect('/reports/trash?error=unauthorized')
  }

  let query = supabase
    .from('reports')
    .delete()
    .eq('deleted', true)

  if (profile?.organization_id) {
    query = query.eq('organization_id', profile.organization_id)
  } else {
    query = query.eq('created_by', user.id)
  }

  const { error } = await query

  if (error) {
    console.error('Error emptying trash:', error)
    redirect('/reports/trash?error=failed')
  }

  revalidatePath('/reports')
  revalidatePath('/reports/trash')
  redirect('/reports/trash?success=emptied')
}

// Get trash reports older than 30 days (for cron job)
export async function getTrashReports() {
  const supabase = await createClient()
  
  // Get reports deleted more than 30 days ago
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data, error } = await supabase
    .from('reports')
    .select('id')
    .eq('deleted', true)
    .lt('deleted_at', thirtyDaysAgo.toISOString())

  if (error) {
    console.error('Error fetching trash reports:', error)
    return []
  }

  return data || []
}
