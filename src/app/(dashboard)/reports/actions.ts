'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function generateReport(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('You must be logged in to generate reports')

    const groupId    = formData.get('group_id') as string
    const type       = formData.get('type') as string
    const termId     = formData.get('term_id') as string
    const templateId = formData.get('template_id') as string

    if (!groupId)    throw new Error('Class is required')
    if (!type)       throw new Error('Report type is required')
    if (!termId)     throw new Error('Term is required')
    if (!templateId) throw new Error('Assessment template is required')

    const { data: profile } = await supabase
      .from('users').select('organization_id').eq('id', user.id).single()
    if (!profile) throw new Error('User profile not found')

    const { data: existing } = await supabase
      .from('reports')
      .select('id, status, created_at')
      .eq('group_id', groupId)
      .eq('type', type)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existing?.status === 'pending') {
      revalidatePath('/reports')
      return { success: false, message: 'Report is already being generated' }
    }

    const reportData = await generateReportData(groupId, termId, templateId, supabase)

    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert({
        organization_id: profile.organization_id,
        group_id:        groupId,
        type,
        status:          'completed',
        completed_at:    new Date().toISOString(),
        filters:         { termId, templateId },
        created_by:      user.id,
        report_data:     reportData,
      })
      .select()
      .single()

    if (insertError) throw new Error('Failed to save report')

    revalidatePath('/reports')
    revalidatePath('/dashboard')

    return { success: true, reportId: report.id }
  } catch (error) {
    console.error('Generate report error:', error)
    return { success: false, message: error instanceof Error ? error.message : 'Failed to generate report' }
  }
}

async function generateReportData(
  groupId: string,
  termId: string,
  templateId: string,
  supabase: any
) {
  // Fetch learners
  const { data: learners } = await supabase
    .from('learners')
    .select('id, first_name, last_name, admission_number')
    .eq('group_id', groupId).eq('is_active', true).order('last_name')

  if (!learners?.length) throw new Error('No learners found in this class')

  // Fetch subjects
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name, code, template_id')
    .eq('group_id', groupId).eq('is_active', true).order('name')

  if (!subjects?.length) throw new Error('No subjects found for this class')

  // Fetch components
  const { data: components } = await supabase
    .from('assessment_components')
    .select('id, name, max_score, sequence')
    .eq('template_id', templateId).order('sequence')

  if (!components?.length) throw new Error('No assessment components found for this template')

  // ✅ Fetch grading system from database
  const { data: gradingSystem } = await supabase
    .from('grading_systems')
    .select('*')
    .order('min_score', { ascending: false })

  // ✅ Use fetched grading system or fallback to default
  const grades = gradingSystem && gradingSystem.length > 0 
    ? gradingSystem.map((g: any) => ({
        min: g.min_score,
        max: g.max_score,
        grade: g.grade_letter,
        remark: g.remark || ''
      }))
    : [
        { min: 70, max: 100, grade: 'A', remark: 'Excellent' },
        { min: 60, max: 69, grade: 'B', remark: 'Very Good' },
        { min: 50, max: 59, grade: 'C', remark: 'Good' },
        { min: 45, max: 49, grade: 'D', remark: 'Fair' },
        { min: 40, max: 44, grade: 'E', remark: 'Pass' },
        { min: 0, max: 39, grade: 'F', remark: 'Fail' },
      ]

  // ✅ Helper function to get grade
  const getGrade = (percentage: number) => {
    for (const g of grades) {
      if (percentage >= g.min && percentage <= g.max) {
        return { grade: g.grade, remark: g.remark || '' }
      }
    }
    return { grade: 'F', remark: 'Fail' }
  }

  // ✅ Build a map of component max scores per subject
  const subjectComponentMap: Record<string, { id: string; name: string; max_score: number }[]> = {}
  subjects.forEach((subject: any) => {
    const comps = components.filter((c: any) => c.template_id === subject.template_id)
    subjectComponentMap[subject.id] = comps.map((c: any) => ({
      id: c.id,
      name: c.name,
      max_score: c.max_score
    }))
  })

  // ✅ Calculate max possible score per subject
  const subjectMaxScore: Record<string, number> = {}
  subjects.forEach((subject: any) => {
    const comps = subjectComponentMap[subject.id] || []
    subjectMaxScore[subject.id] = comps.reduce((sum: number, c: any) => sum + c.max_score, 100)
  })

  const learnerIds = learners.map((l: any) => l.id)
  
  // ✅ Fetch scores with component_id
  const { data: scores } = await supabase
    .from('scores')
    .select('learner_id, subject_id, component_id, score')
    .in('learner_id', learnerIds)

  const reportData = learners.map((learner: any) => {
    const learnerScores = scores?.filter((s: any) => s.learner_id === learner.id) || []
    const subjectTotals: Record<string, number> = {}
    let overallTotal = 0

    // ✅ Build detailed subject scores with component breakdown
    const subjectDetails = subjects.map((subject: any) => {
      const subjectScoreData = learnerScores.filter((s: any) => s.subject_id === subject.id)
      const total = subjectScoreData.reduce((sum: number, s: any) => sum + (s.score || 0), 0)
      subjectTotals[subject.id] = total
      overallTotal += total

      // ✅ Build component scores for this subject
      const componentScores: Record<string, number> = {}
      subjectScoreData.forEach((s: any) => {
        const comp = components.find((c: any) => c.id === s.component_id)
        if (comp) {
          componentScores[comp.name] = s.score || 0
        }
      })

      const maxScore = subjectMaxScore[subject.id] || 100
      const percentage = maxScore > 0 ? (total / maxScore) * 100 : 0

      // ✅ Use database grading system for subject grade
      const gradeResult = getGrade(percentage)

      return {
        subject_id: subject.id,
        subject_name: subject.name,
        total: total,
        max_score: maxScore,
        percentage: Math.round(percentage * 10) / 10,
        grade: gradeResult.grade,
        remark: gradeResult.remark,
        component_scores: componentScores
      }
    })

    const maxScore = components.reduce((sum: number, c: any) => sum + c.max_score, 0)
    const average = subjects.length > 0 ? overallTotal / subjects.length : 0
    const percentage = maxScore > 0 ? (overallTotal / maxScore) * 100 : 0

    // ✅ Use database grading system for overall grade
    const overallGradeResult = getGrade(percentage)

    return {
      learner_id: learner.id,
      first_name: learner.first_name,
      last_name: learner.last_name,
      admission_number: learner.admission_number,
      subject_totals: subjectTotals,
      subject_details: subjectDetails, // ✅ NEW: Detailed subject scores with components
      overall_total: overallTotal,
      average: Math.round(average * 10) / 10,
      percentage: Math.round(percentage * 10) / 10,
      grade: overallGradeResult.grade,
      remark: overallGradeResult.remark,
      scores: learnerScores,
      position: 0,
    }
  })

  const sorted = [...reportData].sort((a, b) => b.overall_total - a.overall_total)
  sorted.forEach((item, index) => {
    item.position = index > 0 && item.overall_total === sorted[index - 1].overall_total
      ? sorted[index - 1].position
      : index + 1
  })

  return {
    learners: reportData,
    subjects: subjects.map((s: any) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      template_id: s.template_id
    })),
    components,
    grading_system: grades, // ✅ Store grading system used
    generated_at: new Date().toISOString(),
    summary: {
      total_learners: learners.length,
      total_subjects: subjects.length,
      total_components: components.length,
      max_possible_score: components.reduce((sum: number, c: any) => sum + c.max_score, 0),
    }
  }
}

export async function markReportReady(reportId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  await supabase.from('reports')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', reportId)

  revalidatePath('/reports')
  revalidatePath('/dashboard')
}

// ✅ For form actions (returns void, uses redirect)
export async function deleteReportAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const id = formData.get('id') as string
  if (!id) {
    throw new Error('Report ID is required')
  }

  const { error } = await supabase.from('reports').delete().eq('id', id)
  if (error) throw error

  revalidatePath('/reports')
  revalidatePath('/dashboard')
  redirect('/reports')
}

// ✅ For client-side calls (returns data) - works for ANY status
export async function deleteReport(formData: FormData): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, message: 'You must be logged in to delete reports' }
    }

    const id = formData.get('id') as string
    if (!id) {
      return { success: false, message: 'Report ID is required' }
    }

    // Check if the report exists - no status restriction
    const { data: existing, error: checkError } = await supabase
      .from('reports')
      .select('id, created_by, status')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return { success: false, message: 'Report not found' }
    }

    // Check if user owns this report (regardless of status)
    if (existing.created_by !== user.id) {
      return { success: false, message: 'You do not have permission to delete this report' }
    }

    // Delete the report - works for any status (pending, processing, completed, failed)
    const { error: deleteError } = await supabase
      .from('reports')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return { success: false, message: 'Failed to delete report' }
    }

    revalidatePath('/reports')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('Unexpected error in deleteReport:', error)
    return { success: false, message: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function getReport(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: report, error } = await supabase
    .from('reports')
    .select(`*, group:groups(id, name, code), term:terms(id, name)`)
    .eq('id', id)
    .single()

  if (error || !report) throw new Error('Report not found')
  return report
}
