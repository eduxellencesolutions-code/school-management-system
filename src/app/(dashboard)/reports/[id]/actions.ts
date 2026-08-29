'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

// ── Notification Helper Functions ──

async function notifyPrincipals(supabase: any, report: any, reportId: string, submitterId: string) {
  try {
    // Find all principals in the organization
    const { data: principals } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', report.organization_id)
      .eq('role', 'principal')

    if (!principals?.length) {
      console.log('ℹ️ No principals found in organization, skipping notification')
      return
    }

    // Get the class name
    const { data: group } = await supabase
      .from('groups')
      .select('name')
      .eq('id', report.group_id)
      .single()

    // Get submitter name
    const { data: submitter } = await supabase
      .from('users')
      .select('name')
      .eq('id', submitterId)
      .single()

    const submitterName = submitter?.name || 'A teacher'

    // ✅ FIX: Use title/body instead of message
    const rows = principals.map((p: any) => ({
      user_id: p.id,
      organization_id: report.organization_id,
      type: 'report_submitted',
      report_id: reportId,
      title: 'Report submitted for approval',
      body: `${group?.name ?? 'A class'} report was submitted for your approval by ${submitterName}`,
    }))

    const { error } = await supabase.from('notifications').insert(rows)
    if (error) {
      console.error('Error inserting notifications:', error)
    } else {
      console.log(`✅ Notified ${principals.length} principal(s) about report submission`)
    }
  } catch (error) {
    console.error('Error notifying principals:', error)
    // Don't throw - notification failure shouldn't break the main flow
  }
}

async function notifyAdmins(supabase: any, report: any, reportId: string, approverId: string) {
  try {
    // Find all admins in the organization
    // Both 'admin' and 'school_admin' are valid roles in the enum
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', report.organization_id)
      .in('role', ['admin', 'school_admin'])

    if (!admins?.length) {
      console.log('ℹ️ No admins found in organization, skipping notification')
      return
    }

    // Get the class name
    const { data: group } = await supabase
      .from('groups')
      .select('name')
      .eq('id', report.group_id)
      .single()

    // Get approver name
    const { data: approver } = await supabase
      .from('users')
      .select('name')
      .eq('id', approverId)
      .single()

    const approverName = approver?.name || 'The principal'

    // ✅ FIX: Use title/body instead of message
    const rows = admins.map((a: any) => ({
      user_id: a.id,
      organization_id: report.organization_id,
      type: 'report_approved',
      report_id: reportId,
      title: 'Report approved',
      body: `${group?.name ?? 'A class'} report was approved by ${approverName} and is ready to lock`,
    }))

    const { error } = await supabase.from('notifications').insert(rows)
    if (error) {
      console.error('Error inserting notifications:', error)
    } else {
      console.log(`✅ Notified ${admins.length} admin(s) about report approval`)
    }
  } catch (error) {
    console.error('Error notifying admins:', error)
    // Don't throw - notification failure shouldn't break the main flow
  }
}

async function getReportContext(reportId: string) {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()

  const { data: report } = await supabase
    .from('reports').select('group_id, organization_id, created_by, report_status').eq('id', reportId).single()

  if (!report) return { report: null, user, isAdmin: false, isSolo: false, isClassTeacher: false, isPrincipal: false }

  // Both 'admin' and 'school_admin' are valid roles in the enum
  const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'
  const isSolo = !profile?.organization_id
  const isPrincipal = profile?.role === 'principal'

  console.log('🔍 Approve check:', { 
    userId: user.id, 
    role: profile?.role, 
    isPrincipal,
    reportId,
    reportStatus: report.report_status
  })

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
  
  const { data, error } = await supabase
    .from('reports')
    .update({ 
      report_status: 'submitted', 
      submitted_by: user!.id, 
      submitted_at: new Date().toISOString() 
    })
    .eq('id', reportId)
    .select('id')

  if (error) return { success: false, message: 'Failed to submit report' }
  if (!data || data.length === 0) {
    return { success: false, message: 'Submission failed — you may not have permission to update this report' }
  }

  try {
    await notifyPrincipals(supabase, report, reportId, user!.id)
  } catch (notifyError) {
    console.error('Notification failed (submission still succeeded):', notifyError)
  }

  revalidatePath(`/reports/${reportId}`)
  revalidatePath('/reports')
  return { success: true }
}

// ✅ UPDATED: Principal approves report with defensive notification wrapping
export async function approveReport(formData: FormData) {
  const reportId = formData.get('id') as string
  const { report, isPrincipal, user } = await getReportContext(reportId)
  if (!report) return { success: false, message: 'Report not found' }
  if (!isPrincipal) return { success: false, message: 'Only the principal/head teacher can approve this report' }
  if (report.report_status !== 'submitted') return { success: false, message: 'Only submitted reports can be approved' }

  // ✅ DEBUG: Log the update attempt
  console.log('📝 Attempting to approve report:', {
    reportId,
    userId: user!.id,
    organizationId: report.organization_id,
    currentStatus: report.report_status,
    isPrincipal
  })

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('reports')
    .update({ 
      report_status: 'approved', 
      approved_by: user!.id, 
      approved_at: new Date().toISOString() 
    })
    .eq('id', reportId)
    .select('id')

  // ✅ DEBUG: Log the result
  console.log('📝 Update result:', { 
    error: error?.message || null,
    errorCode: error?.code || null,
    dataLength: data?.length || 0,
    data: data || null
  })

  if (error) {
    console.error('❌ Update error:', error)
    return { success: false, message: 'Failed to approve report' }
  }
  if (!data || data.length === 0) {
    console.error('❌ No rows updated — RLS may be blocking this update')
    return { success: false, message: 'Approval failed — you may not have permission to update this report' }
  }

  try {
    await notifyAdmins(supabase, report, reportId, user!.id)
  } catch (notifyError) {
    console.error('Notification failed (approval still succeeded):', notifyError)
  }

  revalidatePath(`/reports/${reportId}`)
  revalidatePath('/reports')
  console.log('✅ Report approved successfully:', reportId)
  return { success: true }
}

// ✅ UPDATED: Only admin can publish, and only after approval (solo teachers bypass)
export async function publishReport(formData: FormData) {
  const reportId = formData.get('id') as string
  const { report, isAdmin, isSolo, user } = await getReportContext(reportId)
  if (!report) return { success: false, message: 'Report not found' }
  if (!isAdmin && !isSolo) return { success: false, message: 'Only administrators can publish reports' }
  if (!isSolo && report.report_status !== 'approved') {
    return { success: false, message: 'This report must be approved by the principal before it can be locked' }
  }

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('reports')
    .update({ 
      report_status: 'published', 
      published_by: user!.id, 
      published_at: new Date().toISOString() 
    })
    .eq('id', reportId)
    .select('id')

  if (error) return { success: false, message: 'Failed to publish report' }
  if (!data || data.length === 0) {
    return { success: false, message: 'Publish failed — you may not have permission to update this report' }
  }

  revalidatePath(`/reports/${reportId}`)
  revalidatePath('/reports')
  return { success: true }
}

export async function unpublishReport(formData: FormData) {
  const reportId = formData.get('id') as string
  const { report, isAdmin, isSolo } = await getReportContext(reportId)
  if (!report) return { success: false, message: 'Report not found' }
  if (!isAdmin && !isSolo) return { success: false, message: 'Only administrators can unlock reports' }

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('reports')
    .update({ 
      report_status: 'submitted', 
      published_by: null, 
      published_at: null 
    })
    .eq('id', reportId)
    .select('id')

  if (error) return { success: false, message: 'Failed to unlock report' }
  if (!data || data.length === 0) {
    return { success: false, message: 'Unlock failed — you may not have permission to update this report' }
  }

  revalidatePath(`/reports/${reportId}`)
  revalidatePath('/reports')
  return { success: true }
}

export async function archiveReport(formData: FormData) {
  const reportId = formData.get('id') as string
  const { report, isAdmin, isSolo } = await getReportContext(reportId)
  if (!report) return { success: false, message: 'Report not found' }
  if (!isAdmin && !isSolo) return { success: false, message: 'Only administrators can archive reports' }

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('reports')
    .update({ report_status: 'archived' })
    .eq('id', reportId)
    .select('id')

  if (error) return { success: false, message: 'Failed to archive report' }
  if (!data || data.length === 0) {
    return { success: false, message: 'Archive failed — you may not have permission to update this report' }
  }

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
  
  const { data, error } = await supabase
    .from('reports')
    .update({ report_status: 'published' })
    .eq('id', reportId)
    .select('id')

  if (error) return { success: false, message: 'Failed to restore report' }
  if (!data || data.length === 0) {
    return { success: false, message: 'Restore failed — you may not have permission to update this report' }
  }

  revalidatePath('/reports')
  revalidatePath('/reports/archive')
  return { success: true }
}

// ✅ UPDATED: Soft delete now handles permanent delete too
export async function softDeleteReport(formData: FormData) {
  const reportId = formData.get('id') as string
  const permanent = formData.get('permanent') === 'true'
  
  const { report, isAdmin, isSolo, user } = await getReportContext(reportId)
  if (!report) return { success: false, message: 'Report not found' }
  if (!isAdmin && !isSolo) return { success: false, message: 'Only administrators can delete generated reports' }

  const supabase = await createClient()
  
  // If permanent delete
  if (permanent) {
    const { data, error } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId)
      .select('id')

    if (error) return { success: false, message: 'Failed to permanently delete report' }
    if (!data || data.length === 0) {
      return { success: false, message: 'Permanent delete failed — you may not have permission to delete this report' }
    }

    revalidatePath('/reports')
    revalidatePath('/reports/trash')
    return { success: true, message: 'Report permanently deleted' }
  }

  // Soft delete - move to trash
  const { data, error } = await supabase
    .from('reports')
    .update({ 
      deleted: true, 
      deleted_by: user!.id, 
      deleted_at: new Date().toISOString() 
    })
    .eq('id', reportId)
    .select('id')

  if (error) return { success: false, message: 'Failed to delete report' }
  if (!data || data.length === 0) {
    return { success: false, message: 'Delete failed — you may not have permission to update this report' }
  }

  revalidatePath('/reports')
  revalidatePath('/reports/trash')
  revalidatePath('/dashboard')
  return { success: true, message: 'Report moved to trash' }
}

export async function restoreReport(formData: FormData) {
  const reportId = formData.get('id') as string
  const { report, isAdmin, isSolo } = await getReportContext(reportId)
  if (!report) return { success: false, message: 'Report not found' }
  if (!isAdmin && !isSolo) return { success: false, message: 'Only administrators can restore reports' }

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('reports')
    .update({ 
      deleted: false, 
      deleted_by: null, 
      deleted_at: null 
    })
    .eq('id', reportId)
    .select('id')

  if (error) return { success: false, message: 'Failed to restore report' }
  if (!data || data.length === 0) {
    return { success: false, message: 'Restore failed — you may not have permission to update this report' }
  }

  revalidatePath('/reports')
  revalidatePath('/reports/trash')
  return { success: true }
}

export async function permanentlyDeleteReport(formData: FormData) {
  const reportId = formData.get('id') as string
  const { report, isAdmin, isSolo } = await getReportContext(reportId)
  if (!report) return { success: false, message: 'Report not found' }
  if (!isAdmin && !isSolo) return { success: false, message: 'Only administrators can permanently delete reports' }

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('reports')
    .delete()
    .eq('id', reportId)
    .select('id')

  if (error) return { success: false, message: 'Failed to permanently delete report' }
  if (!data || data.length === 0) {
    return { success: false, message: 'Permanent delete failed — you may not have permission to delete this report' }
  }

  revalidatePath('/reports')
  revalidatePath('/reports/trash')
  return { success: true }
}
