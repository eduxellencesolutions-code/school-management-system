import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { BookOpen, Users, ClipboardList, FileText, ArrowRight, TrendingUp } from 'lucide-react'

export default async function DashboardPage() {
  // ✅ FIX: Add await here
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users').select('*').eq('id', authUser.id).single()

  const orgId = user?.organization_id

  // Parallel data fetch
  const [
    { count: groupCount },
    { count: learnerCount },
    { count: scoreCount },
    { data: recentGroups },
  ] = await Promise.all([
    supabase.from('groups').select('*', { count: 'exact', head: true })
      .eq(orgId ? 'organization_id' : 'instructor_id', orgId ?? authUser.id),
    supabase.from('learners').select('*', { count: 'exact', head: true })
      .eq(orgId ? 'organization_id' : 'instructor_id', orgId ?? authUser.id)
    supabase.from('scores').select('*', { count: 'exact', head: true })
      .eq('entered_by', authUser.id),
    supabase.from('groups').select('id, name, type, created_at, learner_count:learners(count)')
      .eq(orgId ? 'organization_id' : 'instructor_id', orgId ?? authUser.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const stats = [
    { label: 'Classes',       value: groupCount  ?? 0, icon: BookOpen,      href: '/classes',  color: 'text-brand-500',  bg: 'bg-brand-50' },
    { label: 'Students',      value: learnerCount ?? 0, icon: Users,         href: '/students', color: 'text-green-600',  bg: 'bg-green-50' },
    { label: 'Scores entered',value: scoreCount  ?? 0, icon: ClipboardList, href: '/scores',   color: 'text-amber-600',  bg: 'bg-amber-50' },
    { label: 'Reports ready', value: 0,                icon: FileText,      href: '/reports',  color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's what's happening with your classes today.</p>
        </div>
        <Link href="/classes/new" className="btn-primary btn">
          + New Class
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, href, color, bg }) => (
          <Link key={label} href={href} className="stat-card hover:shadow-md transition-shadow group">
            <div className={`w-9 h-9 rounded ${bg} flex items-center justify-center mb-2`}>
              <Icon size={18} className={color} />
            </div>
            <div className="stat-value">{value.toLocaleString()}</div>
            <div className="stat-label">{label}</div>
            <div className="flex items-center gap-1 text-xs text-ink-faint mt-1 group-hover:text-brand-500 transition-colors">
              View all <ArrowRight size={10} />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions + recent classes */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent classes */}
        <div className="lg:col-span-2 card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-sm text-ink">Recent Classes</h2>
            <Link href="/classes" className="text-xs text-brand-500 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-surface-200">
            {recentGroups && recentGroups.length > 0 ? (
              recentGroups.map((g) => {
                const count = (g.learner_count as unknown as { count: number }[])?.[0]?.count ?? 0
                return (
                  <div key={g.id} className="px-5 py-3 flex items-center justify-between hover:bg-surface-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-brand-50 text-brand-600 text-xs font-bold flex items-center justify-center">
                        {g.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink">{g.name}</p>
                        <p className="text-xs text-ink-muted">{count} student{count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/scores?class=${g.id}`} className="btn-secondary btn-sm btn">
                        Enter scores
                      </Link>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="px-5 py-10 text-center">
                <BookOpen size={32} className="text-surface-200 mx-auto mb-3" />
                <p className="text-sm text-ink-muted mb-3">No classes yet</p>
                <Link href="/classes/new" className="btn-primary btn-sm btn">
                  Create your first class
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-col gap-4">
          <div className="card p-5">
            <h2 className="font-semibold text-sm text-ink mb-4">Quick actions</h2>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Add a class',      href: '/classes/new',   icon: '📚' },
                { label: 'Enrol students',   href: '/students/new',  icon: '👤' },
                { label: 'Enter scores',     href: '/scores',        icon: '✏️' },
                { label: 'Generate report', href: '/reports', icon: '📄' },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded border border-surface-200 hover:border-brand-300 hover:bg-brand-50 transition-colors text-sm text-ink group"
                >
                  <span>{a.icon}</span>
                  <span className="font-medium">{a.label}</span>
                  <ArrowRight size={13} className="ml-auto text-ink-faint group-hover:text-brand-500 transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          {/* Plan CTA for free users */}
          {user?.organization_id === null && (
            <div className="card p-5 bg-brand-50 border-brand-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={15} className="text-brand-600" />
                <span className="text-xs font-semibold text-brand-700 uppercase tracking-wider">Free plan</span>
              </div>
              <p className="text-xs text-brand-700 leading-relaxed mb-3">
                Upgrade to Teacher plan for unlimited classes, PDF reports, and AI remarks — just ₦1,000/term.
              </p>
              <Link href="/settings?tab=billing" className="btn-primary btn-sm btn w-full justify-center">
                Upgrade now
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
