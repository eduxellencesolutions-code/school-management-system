import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import SubjectManager from '@/components/dashboard/SubjectManager'
import ClassStats from '@/components/dashboard/ClassStats'
import { Users, BookOpen, ClipboardList, FileText, ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClassDetailPage({ params }: Props) {
  const { id } = await params
  
  console.log('=== CLASS DETAIL PAGE ===')
  console.log('Class ID:', id)
  
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  
  console.log('Auth user:', authUser?.id)
  
  if (!authUser) {
    console.log('No auth user - redirecting to login')
    redirect('/login')
  }

  console.log('Fetching group with ID:', id)

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select(`
      *,
      instructor:users(id, name, email),
      session:academic_sessions(name),
      term:terms(name)
    `)
    .eq('id', id)
    .single()

  console.log('Group query result:', { group, error: groupError })

  if (groupError) {
    console.error('Supabase error details:', groupError)
  }

  if (!group) {
    console.log('⚠️ Group not found - calling notFound()')
    notFound()
  }

  console.log('Group found:', group.name)

  const [
    { data: learners, count: learnerCount },
    { data: subjectsData },
    { data: templates },
  ] = await Promise.all([
    supabase
      .from('learners')
      .select('id, first_name, last_name, admission_number, gender', { count: 'exact' })
      .eq('group_id', id)
      .eq('is_active', true)
      .order('last_name')
      .limit(10),
    supabase
      .from('subjects')
      .select('id, name, code, template_id, instructor:users(name)')
      .eq('group_id', id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('assessment_templates')
      .select('id, name')
      .order('name'),
  ])

  const subjects = subjectsData?.map((subject: any) => ({
    id: subject.id,
    name: subject.name,
    code: subject.code,
    template_id: subject.template_id,
    instructor: subject.instructor?.[0] || null,
    is_active: true,
    organization_id: group.organization_id,
    group_id: id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })) ?? []

  const instructor = group.instructor as { id: string; name: string; email: string } | null
  const session = group.session as { name: string } | null
  const term = group.term as { name: string } | null

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/classes" className="text-ink-muted hover:text-ink flex items-center gap-1">
          <ArrowLeft size={13} /> Classes
        </Link>
        <span className="text-ink-faint">/</span>
        <span className="text-ink font-medium">{group.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="page-title">{group.name}</h1>
            {group.code && <span className="badge badge-gray font-mono">{group.code}</span>}
            <span className={`badge ${group.is_active ? 'badge-green' : 'badge-gray'}`}>
              {group.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="page-subtitle">
            {[session?.name, term?.name].filter(Boolean).join(' · ')}
            {instructor && ` · Teacher: ${instructor.name}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/scores?class=${id}`} className="btn-primary btn">
            <ClipboardList size={14} /> Enter scores
          </Link>
          <Link href={`/reports?class=${id}`} className="btn-secondary btn">
            <FileText size={14} /> Reports
          </Link>
        </div>
      </div>

      {/* Quick nav cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Students',  value: learnerCount ?? 0, icon: Users,          href: `/students?class=${id}`,   color: 'text-brand-500',  bg: 'bg-brand-50' },
          { label: 'Subjects',  value: subjects?.length ?? 0, icon: BookOpen,   href: `#subjects`,                       color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'Enter scores', value: '→', icon: ClipboardList,             href: `/scores?class=${id}`,     color: 'text-amber-600',  bg: 'bg-amber-50' },
          { label: 'Broadsheet', value: '→', icon: FileText,                    href: `/reports?class=${id}`,    color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, href, color, bg }) => (
          <Link key={label} href={href} className="stat-card hover:shadow-md transition-shadow group">
            <div className={`w-8 h-8 rounded ${bg} flex items-center justify-center mb-2`}>
              <Icon size={16} className={color} />
            </div>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Subject manager - left */}
        <div className="lg:col-span-3" id="subjects">
          <SubjectManager
            groupId={id}
            subjects={subjects}
            templates={templates ?? []}
          />
        </div>

        {/* Student roster - right */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-semibold text-sm text-ink">
                Students <span className="text-ink-faint font-normal">({learnerCount ?? 0})</span>
              </h2>
              <div className="flex gap-2">
                <Link href={`/students/import?class=${id}`} className="btn-secondary btn-sm btn">
                  Import CSV
                </Link>
                <Link href={`/students/new?class=${id}`} className="btn-primary btn-sm btn">
                  + Add
                </Link>
              </div>
            </div>

            <div className="divide-y divide-surface-200">
              {learners && learners.length > 0 ? (
                <>
                  {learners.map((l, i) => (
                    <Link
                      key={l.id}
                      href={`/students/${l.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-surface-50 transition-colors"
                    >
                      <span className="text-xs text-ink-faint w-5 text-right shrink-0">{i + 1}</span>
                      <div className="w-7 h-7 rounded-full bg-surface-100 text-ink-muted text-xs font-bold flex items-center justify-center shrink-0">
                        {l.first_name[0]}{l.last_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{l.last_name} {l.first_name}</p>
                        {l.admission_number && (
                          <p className="text-xs text-ink-faint font-mono">{l.admission_number}</p>
                        )}
                      </div>
                      <span className={`badge text-[10px] ${l.gender === 'M' ? 'badge-blue' : l.gender === 'F' ? 'badge-amber' : 'badge-gray'}`}>
                        {l.gender ?? '?'}
                      </span>
                    </Link>
                  ))}
                  {(learnerCount ?? 0) > 10 && (
                    <div className="px-5 py-3">
                      <Link href={`/students?class=${id}`} className="text-sm text-brand-500 hover:underline">
                        View all {learnerCount} students →
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                <div className="px-5 py-10 text-center">
                  <Users size={28} className="text-surface-200 mx-auto mb-2" />
                  <p className="text-sm text-ink-muted mb-3">No students yet</p>
                  <Link href={`/students/new?class=${id}`} className="btn-primary btn-sm btn">
                    Add first student
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
