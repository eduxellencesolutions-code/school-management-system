'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function canEditReport(reportId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()

  const { data: report } = await supabase
    .from('reports').select('group_id, organization_id').eq('id', reportId).single()

  if (!report) return { allowed: false }

  const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'
  const isSolo = !profile?.organization_id

  if (isSolo || isAdmin) return { allowed: true, user }

  // Institution non-admin: must be the class_teacher for this report's class
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
  const { allowed } = await canEditReport(reportId)
  if (!allowed) return { error: 'You are not allowed to edit remarks for this report' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('reports')
    .update({ student_remarks: remarks })
    .eq('id', reportId)

  if (error) {
    console.error('Error saving remarks:', error)
    return { error: 'Failed to save remarks' }
  }

  revalidatePath(`/reports/${reportId}`)
  return { success: true }
}
