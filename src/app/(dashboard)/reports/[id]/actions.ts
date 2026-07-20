'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getReportContext(reportId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()

  const { data: report } = await supabase
    .from('reports').select('group_id, organization_id, created_by, report_status').eq('id', reportId).single()

  if (!report) return { report: null, user, isAdmin: false, isSolo: false, isClassTeacher: false, isPrincipal: false }

  const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'
  const isSolo = !profile?.organization_id
  const isPrincipal = profile?.role === 'principal'

  let isClassTeacher = false
  if (!isSolo && !isAdmin) {
    const { data: assignment } = await supabase
      .from('teacher_assignments')
      .select('id')
      .eq('teacher_id', user.id)
      .eq('class_id', report.group_id)
      .eq('role', 'class_teacher')
      .maybeSingle()
    isClassTeacher = !!assignment
  }

  return { report, user, isAdmin, isSolo, isClassTeacher, isPrincipal }
}

export async function saveStudentRemarks(reportId: string, remarks: Record<string, { teacher_remark?: string; principal_remark?: string }>) {
  const { report, isAdmin, isSolo, isClassTeacher } = await getReportContext(reportId)
  if (!report) return { error: 'Report not found' }
  if (report.report_status === 'published') return { error: 'This report is published and locked. Ask an administrator to unlock it.' }
  if (!isAdmin && !isSolo && !isClassTeacher) return { error: 'You are not allowed to edit remarks for this report' }

  const supabase = await createClient()
  const { error } = await supabase.from('reports').update({ student_remarks: remarks }).eq('id', reportId)

  if (error) {
    console.error('Error saving remarks:', error)
    return { error: 'Failed to save remarks' }
  }

  revalidatePath(`/reports/${reportId}`)
  return { success: true }
}

// ✅ UPDATED: Only class teacher can submit (admin removed)
export async function submitReport(formData: FormData) {
  const reportId = formData.get('id') as string
  const { report, isClassTeacher, user } = await getReportContext(reportId)
  if (!report) return { success: false, message: 'Report not found' }
  if (!isClassTeacher) return { success: false, message: 'Only the class teacher can submit this report for approval' }
  if (report.report_status !== 'draft') return { success: false, message: 'Only draft reports can be submitted' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('reports')
    .update({ report_status: 'submitted', submitted_by: user!.id, submitted_at: new Date().toISOString() })
    .eq('id', reportId)

  if (error) return { success: false, message: 'Failed to submit report' }

  revalidatePath(`/reports/${reportId}`)
  return { success: true }
}

// ✅ NEW: Principal approves report
export async function approveReport(formData: FormData) {
  const reportId = formData.get('id') as string
  const { report, isPrincipal, user } = await getReportContext(reportId)
  if (!report) return { success: false, message: 'Report not found' }
  if (!isPrincipal) return { success: false, message: 'Only the principal/head teacher can approve this report' }
  if (report.report_status !== 'submitted') return { success: false, message: 'Only submitted reports can be approved' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('reports')
    .update({ report_status: 'approved', approved_by: user!.id, approved_at: new Date().toISOString() })
    .eq('id', reportId)

  if (error) return { success: false, message: 'Failed to approve report' }

  revalidatePath(`/reports/${reportId}`)
  return { success: true }
}

// ✅ UPDATED: Only admin can publish, and only after approval (solo teachers bypass)
export async function publishReport(formData: FormData) {
  const reportId = formData.get('id') as string
  const { report, isAdmin, isSolo, user } = await getReportContext(reportId)
  if (!report) return { success: false, message: 'Report not found' }
  if (!isAdmin && !isSolo) return { success: false, message: 'Only administrators can publish reports' }
  // ✅ Solo teachers bypass the approval chain, but institutions require approval
  if (!isSolo && report.report_status !== 'approved') {
    return { success: false, message: 'This report must be approved by the principal before it can be locked' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('reports')
    .update({ report_status: 'published', published_by: user!.id, published_at: new Date().toISOString() })
    .eq('id', reportId)

  if (error) return { success: false, message: 'Failed to publish report' }

  revalidatePath(`/reports/${reportId}`)
  return { success: true }
}

export async function unpublishReport(formData: FormData) {
  const reportId = formData.get('id') as string
  const { report, isAdmin, isSolo } = await getReportContext(reportId)
  if (!report) return { success: false, message: 'Report not found' }
  if (!isAdmin && !isSolo) return { success: false, message: 'Only administrators can unlock reports' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('reports')
    .update({ report_status: 'submitted', published_by: null, published_at: null })
    .eq('id', reportId)

  if (error) return { success: false, message: 'Failed to unlock report' }

  revalidatePath(`/reports/${reportId}`)
  return { success: true }
}

export async function archiveReport(formData: FormData) {
  const reportId = formData.get('id') as string
  const { report, isAdmin, isSolo } = await getReportContext(reportId)
  if (!report) return { success: false, message: 'Report not found' }
  if (!isAdmin && !isSolo) return { success: false, message: 'Only administrators can archive reports' }

  const supabase = await createClient()
  const { error } = await supabase.from('reports').update({ report_status: 'archived' }).eq('id', reportId)
  if (error) return { success: false, message: 'Failed to archive report' }

  revalidatePath(`/reports/${reportId}`)
  revalidatePath('/reports')
  return { success: true }
}

export async function unarchiveReport(formData: FormData) {
  const reportId = formData.get('id') as string
  const { report, isAdmin, isSolo } = await getReportContext(reportId)
  if (!report) return { success: false, message: 'Report not found' }
  if (!isAdmin && !isSolo) return { success: false, message: 'Only administrators can restore archived reports' }

  const supabase = await createClient()
  const { error } = await supabase.from('reports').update({ report_status: 'published' }).eq('id', reportId)
  if (error) return { success: false, message: 'Failed to restore report' }

  revalidatePath('/reports')
  revalidatePath('/reports/archive')
  return { success: true }
}

export async function softDeleteReport(formData: FormData) {
  const reportId = formData.get('id') as string
  const { report, isAdmin, isSolo, user } = await getReportContext(reportId)
  if (!report) return { success: false, message: 'Report not found' }
  if (!isAdmin && !isSolo) return { success: false, message: 'Only administrators can delete generated reports' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('reports')
    .update({ deleted: true, deleted_by: user!.id, deleted_at: new Date().toISOString() })
    .eq('id', reportId)

  if (error) return { success: false, message: 'Failed to delete report' }

  revalidatePath('/reports')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function restoreReport(formData: FormData) {
  const reportId = formData.get('id') as string
  const { report, isAdmin, isSolo } = await getReportContext(reportId)
  if (!report) return { success: false, message: 'Report not found' }
  if (!isAdmin && !isSolo) return { success: false, message: 'Only administrators can restore reports' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('reports')
    .update({ deleted: false, deleted_by: null, deleted_at: null })
    .eq('id', reportId)

  if (error) return { success: false, message: 'Failed to restore report' }

  revalidatePath('/reports')
  return { success: true }
}

export async function permanentlyDeleteReport(formData: FormData) {
  const reportId = formData.get('id') as string
  const { report, isAdmin, isSolo } = await getReportContext(reportId)
  if (!report) return { success: false, message: 'Report not found' }
  if (!isAdmin && !isSolo) return { success: false, message: 'Only administrators can permanently delete reports' }

  const supabase = await createClient()
  const { error } = await supabase.from('reports').delete().eq('id', reportId)
  if (error) return { success: false, message: 'Failed to permanently delete report' }

  revalidatePath('/reports')
  return { success: true }
}
