'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function generateReport(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('You must be logged in to generate reports')
    }

    const groupId = formData.get('group_id') as string
    const type = formData.get('type') as string // 'broadsheet' or 'result_cards'
    const termId = formData.get('term_id') as string
    const templateId = formData.get('template_id') as string

    if (!groupId) {
      throw new Error('Class is required')
    }
    if (!type) {
      throw new Error('Report type is required')
    }
    if (!termId) {
      throw new Error('Term is required')
    }
    if (!templateId) {
      throw new Error('Assessment template is required')
    }

    const { data: profile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      throw new Error('User profile not found')
    }

    // Check if a completed report already exists for this group+type+term
    const { data: existing } = await supabase
      .from('reports')
      .select('id, status, created_at')
      .eq('group_id', groupId)
      .eq('type', type)
      .eq('term_id', termId)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existing) {
      if (existing.status === 'pending') {
        // Already generating
        revalidatePath('/reports')
        return { success: false, message: 'Report is already being generated' }
      }
      if (existing.status === 'completed') {
        // Already exists
        revalidatePath('/reports')
        return { success: false, message: 'A report for this class and term already exists' }
      }
    }

    // Generate the report data
    const reportData = await generateReportData(groupId, termId, templateId, supabase)

    // Create a new report record with 'completed' status
    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert({
        organization_id: profile.organization_id,
        group_id: groupId,
        term_id: termId,
        template_id: templateId,
        type,
        status: 'completed',
        completed_at: new Date().toISOString(),
        report_data: reportData,
        filters: { termId, templateId },
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting report:', insertError)
      throw new Error('Failed to save report')
    }

    revalidatePath('/reports')
    revalidatePath('/dashboard')
    revalidatePath(`/reports/${report.id}`)

    return { success: true, reportId: report.id }
  } catch (error) {
    console.error('Generate report error:', error)
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to generate report' 
    }
  }
}

async function generateReportData(
  groupId: string, 
  termId: string, 
  templateId: string, 
  supabase: any
) {
  // 1. Fetch learners in this group
  const { data: learners } = await supabase
    .from('learners')
    .select('id, first_name, last_name, admission_number')
    .eq('group_id', groupId)
    .eq('is_active', true)
    .order('last_name')

  if (!learners || learners.length === 0) {
    throw new Error('No learners found in this class')
  }

  // 2. Fetch subjects for this group
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name, code, template_id')
    .eq('group_id', groupId)
    .eq('is_active', true)
    .order('name')

  if (!subjects || subjects.length === 0) {
    throw new Error('No subjects found for this class')
  }

  // 3. Fetch assessment components for the template
  const { data: components } = await supabase
    .from('assessment_components')
    .select('id, name, max_score, sequence')
    .eq('template_id', templateId)
    .order('sequence')

  if (!components || components.length === 0) {
    throw new Error('No assessment components found for this template')
  }

  // 4. Fetch scores for all learners
  const learnerIds = learners.map((l: any) => l.id)
  const { data: scores } = await supabase
    .from('scores')
    .select('learner_id, subject_id, component_id, score')
    .in('learner_id', learnerIds)

  // 5. Build the report data structure
  const reportData = learners.map((learner: any) => {
    const learnerScores = scores?.filter((s: any) => s.learner_id === learner.id) || []
    const subjectTotals: Record<string, number> = {}
    let overallTotal = 0

    subjects.forEach((subject: any) => {
      const subjectScores = learnerScores.filter((s: any) => s.subject_id === subject.id)
      const total = subjectScores.reduce((sum: number, s: any) => sum + (s.score || 0), 0)
      subjectTotals[subject.id] = total
      overallTotal += total
    })

    const maxScore = components.reduce((sum: number, c: any) => sum + c.max_score, 0)
    const average = subjects.length > 0 ? (overallTotal / subjects.length) : 0
    const percentage = maxScore > 0 ? (overallTotal / maxScore) * 100 : 0

    // Calculate grade based on percentage
    let grade = 'F'
    if (percentage >= 70) grade = 'A'
    else if (percentage >= 60) grade = 'B'
    else if (percentage >= 50) grade = 'C'
    else if (percentage >= 40) grade = 'D'

    return {
      learner_id: learner.id,
      first_name: learner.first_name,
      last_name: learner.last_name,
      admission_number: learner.admission_number,
      subject_totals: subjectTotals,
      overall_total: overallTotal,
      average: Math.round(average * 10) / 10,
      percentage: Math.round(percentage * 10) / 10,
      grade,
      scores: learnerScores,
    }
  })

  // 6. Calculate positions
  const sorted = [...reportData].sort((a, b) => b.overall_total - a.overall_total)
  sorted.forEach((item, index) => {
    // Handle ties
    if (index > 0 && item.overall_total === sorted[index - 1].overall_total) {
      item.position = sorted[index - 1].position
    } else {
      item.position = index + 1
    }
  })

  return {
    learners: reportData,
    subjects,
    components,
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
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
      .from('reports')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', reportId)

    if (error) throw error

    revalidatePath('/reports')
    revalidatePath('/dashboard')
    revalidatePath(`/reports/${reportId}`)
  } catch (error) {
    console.error('Error marking report ready:', error)
    throw error
  }
}

export async function deleteReport(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const id = formData.get('id') as string
    if (!id) throw new Error('Report ID is required')

    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id)

    if (error) throw error

    revalidatePath('/reports')
    revalidatePath('/dashboard')
  } catch (error) {
    console.error('Error deleting report:', error)
    throw error
  }
}

export async function downloadReport(formData: FormData) {
  'use server'
  
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const id = formData.get('id') as string
    const format = formData.get('format') as string // 'csv', 'xls', 'pdf'

    if (!id) throw new Error('Report ID is required')
    if (!format) throw new Error('Format is required')

    const { data: report, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !report) {
      throw new Error('Report not found')
    }

    // Generate the file content based on format
    let fileContent = ''
    let fileName = ''
    let contentType = ''

    const reportData = report.report_data || {}
    const learners = reportData.learners || []
    const subjects = reportData.subjects || []

    if (format === 'csv') {
      // Generate CSV
      const headers = ['Student', ...subjects.map((s: any) => s.name), 'Total', 'Avg', '%', 'Grade', 'Position']
      const rows = learners.map((learner: any) => {
        const row = [
          `${learner.last_name} ${learner.first_name}`,
          ...subjects.map((s: any) => learner.subject_totals?.[s.id] || 0),
          learner.overall_total || 0,
          learner.average || 0,
          learner.percentage || 0,
          learner.grade || 'F',
          learner.position || 0
        ]
        return row.join(',')
      })
      fileContent = [headers.join(','), ...rows].join('\n')
      fileName = `report_${report.id}.csv`
      contentType = 'text/csv'
    } else if (format === 'xls') {
      // For XLS, we'll use the same as CSV but change extension
      // In a real implementation, you'd use xlsx library
      const headers = ['Student', ...subjects.map((s: any) => s.name), 'Total', 'Avg', '%', 'Grade', 'Position']
      const rows = learners.map((learner: any) => {
        const row = [
          `${learner.last_name} ${learner.first_name}`,
          ...subjects.map((s: any) => learner.subject_totals?.[s.id] || 0),
          learner.overall_total || 0,
          learner.average || 0,
          learner.percentage || 0,
          learner.grade || 'F',
          learner.position || 0
        ]
        return row.join('\t')
      })
      fileContent = [headers.join('\t'), ...rows].join('\n')
      fileName = `report_${report.id}.xls`
      contentType = 'application/vnd.ms-excel'
    } else if (format === 'pdf') {
      // For PDF, we'll redirect to the view page with print dialog
      // The view page will handle PDF generation
      redirect(`/reports/${id}?print=true`)
    }

    // Return the file as a response
    // Since we're in a server action, we need to use a different approach
    // We'll use a response with the file content
    const response = new Response(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
    return response
  } catch (error) {
    console.error('Error downloading report:', error)
    throw error
  }
}

export async function getReport(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: report, error } = await supabase
      .from('reports')
      .select(`
        *,
        group:groups(id, name, code),
        term:terms(id, name),
        template:assessment_templates(id, name)
      `)
      .eq('id', id)
      .single()

    if (error || !report) {
      throw new Error('Report not found')
    }

    return report
  } catch (error) {
    console.error('Error fetching report:', error)
    throw error
  }
}
