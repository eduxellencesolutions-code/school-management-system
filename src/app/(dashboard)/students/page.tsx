import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, Plus, Upload } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import DeleteStudentButton from '@/components/students/DeleteStudentButton'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  searchParams: Promise<{ class?: string; q?: string; success?: string; error?: string }>
}

import ClassFilter from '@/components/students/ClassFilter'

export default async function StudentsPage({ searchParams }: Props) {
  const params = await searchParams

  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', authUser.id)
    .single()

  const orgId = profile?.organization_id
  const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'

  // ✅ FIX: Add permission checks for students.view and fees.view
  const { data: hasStudentsViewData } = orgId
    ? await supabase.rpc('has_permission', { p_user_id: authUser.id, p_permission_key: 'students.view' })
    : { data: false }
  const { data: hasFeesViewData } = orgId
    ? await supabase.rpc('has_permission', { p_user_id: authUser.id, p_permission_key: 'fees.view' })
    : { data: false }
  const hasFullStudentAccess = !!hasStudentsViewData || !!hasFeesViewData

  let groupsQuery = supabase
    .from('groups')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  let query = supabase
    .from('learners')
    .select('id, first_name, last_name, admission_number, gender, is_active, created_at, group:groups(name)')
    .eq('is_active', true)
    .order('last_name')
    .limit(100)

  let userType = ''

  // ✅ FIX: Branch the query logic to treat hasFullStudentAccess like admin-level access
  if (orgId && (isAdmin || hasFullStudentAccess)) {
    // ✅ Institution admin, or staff with students.view/fees.view: full access
    userType = 'institution'
    groupsQuery = groupsQuery.eq('organization_id', orgId)
    query = query.eq('organization_id', orgId)
  } else if (orgId && !isAdmin) {
    // ✅ Assigned teacher: view-only
    userType = 'assigned'
    const { data: assignments } = await supabase
      .from('teacher_assignments')
      .select('class_id')
      .eq('teacher_id', authUser.id)
      .not('class_id', 'is', null)

    const classIds = [...new Set((assignments ?? []).map(a => a.class_id))]

    if (classIds.length > 0) {
      groupsQuery = groupsQuery.in('id', classIds)
      query = query.in('group_id', classIds)
    } else {
      groupsQuery = groupsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
      query = query.eq('id', '00000000-0000-0000-0000-000000000000')
    }
  } else {
    // ✅ Solo teacher
    userType = 'solo'
    const { data: teacherGroups } = await supabase
      .from('groups')
      .select('id')
      .eq('instructor_id', authUser.id)
      .eq('is_active', true)

    const groupIds = teacherGroups?.map(g => g.id) ?? []

    if (groupIds.length > 0) {
      groupsQuery = groupsQuery.in('id', groupIds)
      query = query.in('group_id', groupIds)
    } else {
      groupsQuery = groupsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
      query = query.eq('id', '00000000-0000-0000-0000-000000000000')
    }
  }

  const { data: groups } = await groupsQuery

  if (params.class) query = query.eq('group_id', params.class)

  const { data: learners } = await query

  // ✅ Handle all success/error messages from actions
  let message = null
  if (params.success === 'deleted') {
    message = { type: 'success', text: 'Student deleted successfully!' }
  } else if (params.success === 'added') {
    message = { type: 'success', text: 'Student added successfully!' }
  } else if (params.error === 'delete_failed') {
    message = { type: 'error', text: 'Failed to delete student. Please try again.' }
  } else if (params.error === 'unexpected') {
    message = { type: 'error', text: 'Something went wrong. Please try again.' }
  } else if (params.error === 'no_id') {
    message = { type: 'error', text: 'Student ID is required.' }
  } else if (params.error === 'no_class') {
    message = { type: 'error', text: 'Please select a class.' }
  } else if (params.error === 'missing_name') {
    message = { type: 'error', text: 'First name and last name are required.' }
  } else if (params.error && params.error.includes('Admission number already exists')) {
    message = { type: 'error', text: 'Admission number already exists. Please use a unique admission number.' }
  } else if (params.error && params.error.includes('Failed to add student')) {
    message = { type: 'error', text: 'Failed to add student. Please try again.' }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">
            {learners?.length ?? 0} student{learners?.length !== 1 ? 's' : ''} found
          </p>
        </div>
        {userType !== 'assigned' && (
          <div className="flex gap-2">
            <Link href="/students/import" className="btn-secondary btn">
              <Upload size={14} /> Import CSV
            </Link>
            <Link href="/students/new" className="btn-primary btn">
              <Plus size={14} /> Add Student
            </Link>
          </div>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <ClassFilter groups={groups ?? []} selectedClass={params.class ?? ''} />

      {learners && learners.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Adm. No</th>
                  <th>Class</th>
                  <th>Gender</th>
                  <th>Enrolled</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {learners.map((l, i) => {
                  const group = l.group as unknown as { name: string } | null
                  return (
                    <tr key={l.id}>
                      <td className="text-ink-muted text-xs">{i + 1}</td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-surface-100 text-ink-muted text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {l.first_name?.[0]}{l.last_name?.[0]}
                          </div>
                          <span className="font-medium text-ink">{l.last_name} {l.first_name}</span>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-ink-muted">{l.admission_number ?? '—'}</td>
                      <td className="text-ink-muted text-sm">{group?.name ?? '—'}</td>
                      <td>
                        {l.gender && (
                          <span className={`badge ${l.gender === 'M' ? 'badge-blue' : l.gender === 'F' ? 'badge-amber' : 'badge-gray'}`}>
                            {l.gender === 'M' ? 'Male' : l.gender === 'F' ? 'Female' : 'Other'}
                          </span>
                        )}
                      </td>
                      <td className="text-xs text-ink-muted">{formatDate(l.created_at)}</td>
                      <td>
                        <div className="flex items-center gap-1 justify-end">
                          <Link href={`/students/${l.id}`} className="btn-ghost btn-sm btn">
                            View →
                          </Link>
                          {userType !== 'assigned' && (
                            <DeleteStudentButton
                              studentId={l.id}
                              studentName={`${l.first_name} ${l.last_name}`}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card py-16 flex flex-col items-center text-center">
          <Users size={40} className="text-surface-200 mb-4" />
          <h3 className="font-semibold text-ink mb-1">No students yet</h3>
          {userType !== 'assigned' && (
            <>
              <p className="text-sm text-ink-muted mb-6 max-w-xs">
                Add students one by one or import them all at once using a CSV file.
              </p>
              <div className="flex gap-2">
                <Link href="/students/import" className="btn-secondary btn">Import CSV</Link>
                <Link href="/students/new" className="btn-primary btn">Add student</Link>
              </div>
            </>
          )}
          {userType === 'assigned' && (
            <p className="text-sm text-ink-muted mb-6 max-w-xs">
              You don't have any students assigned to you yet.
            </p>
          )}
        </div>
      )}
    </div>
  )
}