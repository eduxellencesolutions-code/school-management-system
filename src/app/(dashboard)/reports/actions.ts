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
  const { data: learners } = await supabase
    .from('learners')
    .select('id, first_name, last_name, admission_number')
    .eq('group_id', groupId).eq('is_active', true).order('last_name')

  if (!learners?.length) throw new Error('No learners found in this class')

  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name, code, template_id')
    .eq('group_id', groupId).eq('is_active', true).order('name')

  if (!subjects?.length) throw new Error('No subjects found for this class')

  const { data: components } = await supabase
    .from('assessment_components')
    .select('id, name, max_score, sequence')
    .eq('template_id', templateId).order('sequence')

  if (!components?.length) throw new Error('No assessment components found for this template')

  const learnerIds = learners.map((l: any) => l.id)
  const { data: scores } = await supabase
    .from('scores')
    .select('learner_id, subject_id, component_id, score')
    .in('learner_id', learnerIds)

  const reportData = learners.map((learner: any) => {
    const learnerScores = scores?.filter((s: any) => s.learner_id === learner.id) || []
    const subjectTotals: Record<string, number> = {}
    let overallTotal = 0

    subjects.forEach((subject: any) => {
      const total = learnerScores
        .filter((s: any) => s.subject_id === subject.id)
        .reduce((sum: number, s: any) => sum + (s.score || 0), 0)
      subjectTotals[subject.id] = total
      overallTotal += total
    })

    const maxScore  = components.reduce((sum: number, c: any) => sum + c.max_score, 0)
    const average   = subjects.length > 0 ? overallTotal / subjects.length : 0
    const percentage = maxScore > 0 ? (overallTotal / maxScore) * 100 : 0

    let grade = 'F'
    if (percentage >= 70) grade = 'A'
    else if (percentage >= 60) grade = 'B'
    else if (percentage >= 50) grade = 'C'
    else if (percentage >= 40) grade = 'D'

    return {
      learner_id: learner.id,
      first_name: learner.first_name,
      last_name:  learner.last_name,
      admission_number: learner.admission_number,
      subject_totals: subjectTotals,
      overall_total:  overallTotal,
      average:        Math.round(average * 10) / 10,
      percentage:     Math.round(percentage * 10) / 10,
      grade,
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
    subjects,
    components,
    generated_at: new Date().toISOString(),
    summary: {
      total_learners:    learners.length,
      total_subjects:    subjects.length,
      total_components:  components.length,
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

export async function deleteReport(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('No user found')
      return { success: false, message: 'You must be logged in to delete reports' }
    }

    const id = formData.get('id') as string
    if (!id) {
      console.error('No report ID provided')
      return { success: false, message: 'Report ID is required' }
    }

    console.log('Deleting report:', id, 'by user:', user.id)

    // First check if the report exists and belongs to the user
    const { data: existing, error: checkError } = await supabase
      .from('reports')
      .select('id, created_by')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      console.error('Report not found:', checkError)
      return { success: false, message: 'Report not found' }
    }

    // Check if user owns this report
    if (existing.created_by !== user.id) {
      console.error('User does not own this report')
      return { success: false, message: 'You do not have permission to delete this report' }
    }

    // Delete the report
    const { error: deleteError } = await supabase
      .from('reports')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return { success: false, message: 'Failed to delete report' }
    }

    revalidatePath('/reports')
    revalidatePath('/dashboard')

    console.log('Report deleted successfully:', id)
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
