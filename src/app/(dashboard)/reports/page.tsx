import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileText, Users, BookOpen, ClipboardList } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  const orgId = profile?.organization_id

  // Fetch all stats in parallel
  const [
    { count: classCount },
    { count: studentCount },
    { count: subjectCount },
    { count: reportCount },
  ] = await Promise.all([
    supabase
      .from('groups')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId ?? '00000000-0000-0000-0000-000000000000')
      .eq('is_active', true),
    supabase
      .from('learners')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId ?? '00000000-0000-0000-0000-000000000000')
      .eq('is_active', true),
    supabase
      .from('subjects')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId ?? '00000000-0000-0000-0000-000000000000')
      .eq('is_active', true),
    supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId ?? '00000000-0000-0000-0000-000000000000')
      .eq('status', 'completed'),
  ])

  const stats = [
    { label: 'Classes', value: classCount ?? 0, icon: BookOpen, href: '/classes', color: 'text-brand-500', bg: 'bg-brand-50' },
    { label: 'Students', value: studentCount ?? 0, icon: Users, href: '/students', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Subjects', value: subjectCount ?? 0, icon: ClipboardList, href: '/classes', color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Reports ready', value: reportCount ?? 0, icon: FileText, href: '/reports', color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {profile?.name || 'Teacher'}!</p>
        </div>
        <Link href="/classes/new" className="btn-primary btn">
          <Plus size={15} /> New Class
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, href, color, bg }) => (
          <Link key={label} href={href} className="stat-card hover:shadow-md transition-shadow group">
            <div className={`w-8 h-8 rounded ${bg} flex items-center justify-center mb-2`}>
              <Icon size={16} className={color} />
            </div>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-sm text-ink">Quick Actions</h2>
          </div>
          <div className="card-body flex flex-wrap gap-2">
            <Link href="/students/new" className="btn-secondary btn-sm btn">Add Student</Link>
            <Link href="/students/import" className="btn-secondary btn-sm btn">Import CSV</Link>
            <Link href="/scores" className="btn-secondary btn-sm btn">Enter Scores</Link>
            <Link href="/reports" className="btn-secondary btn-sm btn">Generate Reports</Link>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-sm text-ink">Recent Activity</h2>
          </div>
          <div className="card-body">
            <p className="text-sm text-ink-muted">No recent activity to show.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
