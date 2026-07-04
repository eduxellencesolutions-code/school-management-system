import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserPlus } from 'lucide-react'
import TeacherManager from '@/components/settings/TeacherManager'

export default async function TeachersPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('organization_id, role').eq('id', authUser.id).single()

  // Only institutions can access this page
  if (!profile?.organization_id) {
    redirect('/dashboard')
  }

  // Get all teachers in the organization
  const { data: teachers } = await supabase
    .from('users')
    .select(`
      id, name, email, role,
      teacher_assignments(
        id,
        class_id,
        subject_id,
        role,
        groups:class_id(id, name),
        subjects:subject_id(id, name)
      )
    `)
    .eq('organization_id', profile?.organization_id)
    .neq('role', 'admin')
    .order('name')

  // Get all classes
  const { data: classes } = await supabase
    .from('groups')
    .select('id, name')
    .eq('organization_id', profile?.organization_id)
    .eq('is_active', true)
    .order('name')

  // Get all subjects
  const { data: subjects } = await supabase
    .from('subjects')
    .select(`
      id, name, group_id,
      group:groups(name)
    `)
    .eq('organization_id', profile?.organization_id)
    .eq('is_active', true)
    .order('name')

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/settings" className="text-ink-muted hover:text-ink flex items-center gap-1">
          <ArrowLeft size={13} /> Settings
        </Link>
        <span className="text-ink-faint">/</span>
        <span className="text-ink font-medium">Teachers</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Teacher Management</h1>
          <p className="page-subtitle">
            Manage teachers, assign them to classes and subjects. Teachers will only see what they're assigned to.
          </p>
        </div>
        <Link href="/settings/teachers/new" className="btn-primary btn shrink-0">
          <UserPlus size={14} /> Add Teacher
        </Link>
      </div>

      <TeacherManager 
        teachers={teachers || []} 
        classes={classes || []} 
        subjects={subjects || []} 
      />
    </div>
  )
}
