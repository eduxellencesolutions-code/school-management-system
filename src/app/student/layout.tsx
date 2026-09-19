// FILE: src/app/student/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentPortalShell from '@/components/student/StudentPortalShell'
import { getPortalContext, comparePortalToSession } from '@/lib/domains/portalContext'
import WrongPortalNotice from '@/components/domains/WrongPortalNotice'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) redirect('/login')

  const { data: learnerId } = await supabase.rpc('get_my_learner_id')

  if (!learnerId) {
    redirect('/login?error=' + encodeURIComponent('This login is not linked to a student portal account.'))
  }

  const { data: learner } = await supabase
    .from('learners')
    .select('organization_id')
    .eq('id', learnerId)
    .single()

  const portal = await getPortalContext()
  const portalMatch = comparePortalToSession(portal, learner?.organization_id ?? null)

  if (portalMatch === 'mismatch') {
    return (
      <WrongPortalNotice
        orgId={portal.organizationId}
        orgName={portal.orgName}
        correctPortalHref="/student"
      />
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      <StudentPortalShell />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}