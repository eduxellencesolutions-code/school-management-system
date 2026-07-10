import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Plus, Users, ClipboardList, Settings } from 'lucide-react'
import DeleteGroupButton from '@/components/classes/DeleteGroupButton'

// ✅ Force dynamic rendering to fix searchParams error
export const dynamic = 'force-dynamic'
export const revalidate = 0

// ✅ Use the correct Next.js 15 PageProps type
type PageProps = {
  searchParams: Promise<{ success?: string; error?: string }>
}

export default async function ClassesPage({ searchParams }: PageProps) {
  try {
    // ✅ Await the searchParams promise
    const params = await searchParams
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    console.log('🔍 Classes Page - User:', authUser?.id)
    
    if (!authUser) {
      console.log('❌ No user in classes page - redirecting to login')
      redirect('/login')
    }

    // ✅ Get user profile with organization
    const { data: profile } = await supabase
      .from('users')
      .select('*, organization:organizations(*)')
      .eq('id', authUser.id)
      .single()

    if (!profile) {
      console.error('❌ No profile found for user:', authUser.id)
      redirect('/login')
    }

    const isInstitution = !!profile.organization_id
    const isAdmin = profile.role === 'admin' || profile.role === 'school_admin'

    console.log('👤 Profile:', { 
      name: profile.name, 
      role: profile.role, 
      organization_id: profile.organization_id,
      isInstitution,
      isAdmin
    })

    // ✅ Build the query based on user type
    const groupsQuery = supabase
      .from('groups')
      .select(`
        id, 
        name, 
        code, 
        type, 
        is_active, 
        created_at,
        organization_id,
        instructor_id,
        session:academic_sessions(name),
        term:terms(name),
        learner_count:learners(count),
        subject_count:subjects(count)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    // ✅ Apply filter based on user type
    let query
    let userType = ''

    if (isInstitution && isAdmin) {
      // ✅ INSTITUTION ADMIN: Show all classes in the organization
      userType = 'institution'
      query = groupsQuery.eq('organization_id', profile.organization_id)
      console.log('🏫 Institution admin mode - showing organization classes')
    } else if (isInstitution && !isAdmin) {
      // ✅ ASSIGNED TEACHER: Only classes they're assigned to
      userType = 'assigned'
      console.log('👨‍🏫 Assigned teacher mode - showing assigned classes')
      
      const { data: assignments } = await supabase
        .from('teacher_assignments')
        .select('class_id')
        .eq('teacher_id', authUser.id)
        .not('class_id', 'is', null)

      const classIds = [...new Set((assignments ?? []).map(a => a.class_id))]
      query = classIds.length > 0
        ? groupsQuery.in('id', classIds)
        : groupsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
    } else {
      // ✅ SOLO TEACHER: Show only their own classes
      userType = 'solo'
      query = groupsQuery.eq('instructor_id', authUser.id)
      console.log('👨‍🏫 Solo teacher mode - showing personal classes')
    }

    const { data: groups, error } = await query

    if (error) {
      console.error('❌ Error fetching classes:', error)
    }

    console.log('📚 Classes found:', groups?.length || 0)

    // ✅ Use empty array if no groups
    const classList = groups || []

    // ✅ Look up actual class teachers via teacher_assignments
    const classIds = (classList ?? []).map(g => g.id)
    const { data: classTeacherAssignments } = classIds.length > 0
      ? await supabase
          .from('teacher_assignments')
          .select('class_id, teacher:users!teacher_assignments_teacher_id_fkey(name)')
          .in('class_id', classIds)
          .eq('role', 'class_teacher')
      : { data: [] }

    const classTeacherMap = Object.fromEntries(
      (classTeacherAssignments ?? []).map(a => [a.class_id, (a.teacher as any)?.name ?? null])
    )

    console.log('📚 Class Teacher Map:', classTeacherMap)

    // ✅ Handle URL messages
    let message = null
    if (params.success === 'deleted') {
      message = { type: 'success', text: 'Class deleted successfully!' }
    } else if (params.error === 'has_students') {
      message = { type: 'error', text: 'Cannot delete class: students are still enrolled.' }
    } else if (params.error === 'delete_failed') {
      message = { type: 'error', text: 'Failed to delete class. Please try again.' }
    }

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Classes</h1>
            <p className="page-subtitle">
              {userType === 'institution'
                ? `Manage all classes in ${profile?.organization?.name || 'your organization'}`
                : userType === 'assigned'
                ? 'Classes assigned to you'
                : 'Manage your personal classes'}
            </p>
          </div>
          {/* ✅ Hide New Class button for assigned teachers */}
          {userType !== 'assigned' && (
            <Link href="/classes/new" className="btn-primary btn">
              <Plus size={15} /> New Class
            </Link>
          )}
        </div>

        {/* ✅ Show messages */}
        {message && (
          <div className={`p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-700' 
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {classList.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classList.map((g) => {
              const learners = (g.learner_count as unknown as { count: number }[])?.[0]?.count ?? 0
              const subjects = (g.subject_count as unknown as { count: number }[])?.[0]?.count ?? 0
              // ✅ For solo teachers, use instructor_id; for institution, use classTeacherMap
              const teacherName = userType === 'solo'
                ? (g.instructor_id ? (g as any).instructor?.name : null)
                : classTeacherMap[g.id]

              return (
                <div key={g.id} className="card hover:shadow-md transition-shadow">
                  <div className="card-header flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-700 font-bold text-sm flex items-center justify-center">
                      {g.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink text-sm truncate">{g.name}</p>
                      {g.code && <p className="text-xs text-ink-muted">{g.code}</p>}
                    </div>
                    <span className={`badge ${g.is_active ? 'badge-green' : 'badge-gray'}`}>
                      {g.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="card-body flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                        <Users size={12} /> {learners} student{learners !== 1 ? 's' : ''}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                        <BookOpen size={12} /> {subjects} subject{subjects !== 1 ? 's' : ''}
                      </div>
                    </div>
                    {teacherName && (
                      <p className="text-xs text-ink-muted">Teacher: {teacherName}</p>
                    )}
                    {(g.session as unknown as { name: string } | null)?.name && (
                      <p className="text-xs text-ink-muted">
                        {(g.session as unknown as { name: string }).name}
                        {(g.term as unknown as { name: string } | null)?.name &&
                          ` · ${(g.term as unknown as { name: string }).name}`}
                      </p>
                    )}
                    <div className="flex gap-2 mt-1">
                      <Link
                        href={`/scores?class=${g.id}`}
                        className="btn-primary btn-sm btn flex-1 justify-center"
                      >
                        <ClipboardList size={12} /> Scores
                      </Link>
                      <Link
                        href={`/classes/${g.id}`}
                        className="btn-secondary btn-sm btn flex-1 justify-center"
                      >
                        <Settings size={12} /> {userType === 'assigned' ? 'View' : 'Manage'}
                      </Link>
                      {/* ✅ Hide Delete button for assigned teachers */}
                      {userType !== 'assigned' && (
                        <DeleteGroupButton groupId={g.id} groupName={g.name} />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card py-16 flex flex-col items-center justify-center text-center">
            <BookOpen size={40} className="text-surface-200 mb-4" />
            <h3 className="font-semibold text-ink mb-1">
              {userType === 'assigned' ? 'No classes assigned yet' : 'No classes yet'}
            </h3>
            <p className="text-sm text-ink-muted mb-6 max-w-xs">
              {userType === 'assigned'
                ? 'You haven\'t been assigned to any classes yet. Contact your school administrator.'
                : 'Create your first class to start enrolling students and entering scores.'}
            </p>
            {userType !== 'assigned' && (
              <Link href="/classes/new" className="btn-primary btn">
                <Plus size={15} /> Create first class
              </Link>
            )}
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error('🔥 Fatal error in classes page:', error)
    return (
      <div className="flex flex-col gap-6">
        <div className="card p-8 text-center border-red-200 bg-red-50">
          <h2 className="text-lg font-semibold text-red-600 mb-2">Something went wrong</h2>
          <p className="text-ink-muted">Please try refreshing the page.</p>
          <pre className="mt-4 text-xs text-left bg-white p-4 rounded overflow-auto max-h-40 border border-red-100">
            {error instanceof Error ? error.message : 'Unknown error'}
          </pre>
          <Link href="/classes" className="btn-primary btn mt-4">
            Try again
          </Link>
        </div>
      </div>
    )
  }
}
