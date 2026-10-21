// FILE: src/app/parent/results/[learnerId]/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'
import ResultsExperience from '@/components/results/ResultsExperience'

export default async function ParentChildResultsPage({ params }: { params: Promise<{ learnerId: string }> }) {
  const { learnerId } = await params
  const supabase = await createClient()
  const { user: authUser } = await getAuthenticatedUser(supabase)
  if (!authUser) redirect('/login')

  const { data: parentAccount } = await supabase
    .from('parent_accounts')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .single()
  if (!parentAccount) redirect('/login')

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 pb-28">
        <Link href="/parent/results" className="text-sm text-brand-600 hover:underline">← All linked students</Link>
        <div className="mt-3">
          <ResultsExperience learnerId={learnerId} />
        </div>
      </div>
    </div>
  )
}