import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import TeacherForm from '@/components/settings/TeacherForm'

export default async function NewTeacherPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('organization_id').eq('id', authUser.id).single()

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
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/settings/teachers" className="text-ink-muted hover:text-ink flex items-center gap-1">
          <ArrowLeft size={13} /> Teachers
        </Link>
        <span className="text-ink-faint">/</span>
        <span className="text-ink font-medium">Add Teacher</span>
      </div>

      <div>
        <h1 className="page-title">Add New Teacher</h1>
        <p className="page-subtitle">
          Create a teacher account and assign them to classes and subjects.
        </p>
      </div>

      <TeacherForm classes={classes || []} subjects={subjects || []} />
    </div>
  )
}