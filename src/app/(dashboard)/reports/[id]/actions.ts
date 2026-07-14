'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireAdminOrSolo(reportId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'
  const isSolo = !profile?.organization_id

  if (!isAdmin && !isSolo) {
    return { allowed: false, user }
  }

  // Solo teachers can only manage their own reports
  if (isSolo) {
    const { data: report } = await supabase.from('reports').select('created_by').eq('id', reportId).single()
    if (report?.created_by !== user.id) return { allowed: false, user }
  }

  return { allowed: true, user }
}

async function canEditReport(reportId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()

  const { data: report } = await supabase
    .from('reports').select('group_id, organization_id, locked').eq('id', reportId).single()

  if (!report) return { allowed: false }
  if (report.locked) return { allowed: false, locked: true }

  const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'
  const isSolo = !profile?.organization_id

  if (isSolo || isAdmin) return { allowed: true, user }

  const { data: assignment } = await supabase
    .from('teacher_assignments')
    .select('id')
    .eq('teacher_id', user.id)
    .eq('class_id', report.group_id)
    .eq('role', 'class_teacher')
    .maybeSingle()

  return { allowed: !!assignment, user }
}

export async function saveStudentRemarks(reportId: string, remarks: Record<string, { teacher_remark?: string; principal_remark?: string }>) {
  const { allowed, locked } = await canEditReport(reportId)
  if (locked) return { error: 'This report is locked and cannot be edited. Ask an administrator to unlock it.' }
  if (!allowed) return { error: 'You are not allowed to edit remarks for this report' }

  const supabase = await createClient()
  const { error } = await supabase.from('reports').update({ student_remarks: remarks }).eq('id', reportId)

  if (error) {
    console.error('Error saving remarks:', error)
    return { error: 'Failed to save remarks' }
  }

  revalidatePath(`/reports/${reportId}`)
  return { success: true }
}

export async function softDeleteReport(formData: FormData) {
  const reportId = formData.get('id') as string
  if (!reportId) return { success: false, message: 'Report ID is required' }

  const { allowed, user } = await requireAdminOrSolo(reportId)
  if (!allowed) return { success: false, message: 'Only administrators can delete generated reports' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('reports')
    .update({ deleted: true, deleted_by: user!.id, deleted_at: new Date().toISOString() })
    .eq('id', reportId)

  if (error) {
    console.error('Error deleting report:', error)
    return { success: false, message: 'Failed to delete report' }
  }

  revalidatePath('/reports')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function restoreReport(formData: FormData) {
  const reportId = formData.get('id') as string
  if (!reportId) return { success: false, message: 'Report ID is required' }

  const { allowed } = await requireAdminOrSolo(reportId)
  if (!allowed) return { success: false, message: 'Only administrators can restore reports' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('reports')
    .update({ deleted: false, deleted_by: null, deleted_at: null })
    .eq('id', reportId)

  if (error) {
    console.error('Error restoring report:', error)
    return { success: false, message: 'Failed to restore report' }
  }

  revalidatePath('/reports')
  return { success: true }
}

export async function toggleReportLock(formData: FormData) {
  const reportId = formData.get('id') as string
  const lock = formData.get('lock') === 'true'
  if (!reportId) return { success: false, message: 'Report ID is required' }

  const { allowed, user } = await requireAdminOrSolo(reportId)
  if (!allowed) return { success: false, message: 'Only administrators can lock or unlock reports' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('reports')
    .update(
      lock
        ? { locked: true, locked_by: user!.id, locked_at: new Date().toISOString() }
        : { locked: false, locked_by: null, locked_at: null }
    )
    .eq('id', reportId)

  if (error) {
    console.error('Error toggling report lock:', error)
    return { success: false, message: 'Failed to update lock status' }
  }

  revalidatePath(`/reports/${reportId}`)
  return { success: true }
}
