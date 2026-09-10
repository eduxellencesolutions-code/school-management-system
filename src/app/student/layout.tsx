// FILE: src/app/student/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentPortalShell from '@/components/student/StudentPortalShell'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) redirect('/login')

  // Students are NOT rows in `users` (that table is staff-only) — their
  // identity is resolved via learners.auth_user_id, the same mechanism
  // parent_accounts.auth_user_id already uses, but reached through a
  // real Supabase Auth session rather than the K-12 PIN flow. This is
  // deliberately a separate authentication model from /parent.
  const { data: learnerId } = await supabase.rpc('get_my_learner_id')

  if (!learnerId) {
    redirect('/login?error=' + encodeURIComponent('This login is not linked to a student portal account.'))
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