// FILE: src/app/parent/results/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'
import type { ResultsBundle } from '@/lib/results/bundleTypes'

export default async function ParentResultsPage() {
  const supabase = await createClient()
  const { user: authUser } = await getAuthenticatedUser(supabase)
  if (!authUser) redirect('/login')

  const { data: parentAccount } = await supabase
    .from('parent_accounts')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .single()
  if (!parentAccount) redirect('/login')

  const { data, error } = await supabase.rpc('get_my_linked_tertiary_bundles')
  const payload = (data ?? null) as { children?: ResultsBundle[]; unavailable_count?: number } | null
  const children = error ? [] : (payload?.children ?? [])

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="page-title mb-1">University results</h1>
        <p className="page-subtitle mb-6">Published results of the students linked to your account.</p>

        {children.length === 0 && (
          <div className="card p-6">
            <p className="text-sm text-ink-muted">
              No university results are available. This happens when none of your linked students is at a university, or when the institution has not
              enabled parent access to results.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {children.map(c => (
            <Link key={c.profile.learner_id} href={`/parent/results/${c.profile.learner_id}`} className="card p-5 block hover:shadow-md transition-shadow">
              <p className="text-xs uppercase tracking-wider text-ink-faint">{c.institution.name}</p>
              <p className="text-lg font-semibold text-ink">{c.profile.first_name} {c.profile.last_name}</p>
              <p className="text-sm text-ink-muted">{c.profile.programme_name}{c.profile.current_level ? ` · Level ${c.profile.current_level}` : ''}</p>
              <p className="text-sm text-ink mt-2">
                Cumulative GPA <b>{c.totals.cgpa !== null ? c.totals.cgpa.toFixed(2) : 'not available yet'}</b>
                {' · '}{Math.round(c.totals.credits_earned)} credits earned
              </p>
            </Link>
          ))}
        </div>

        {(payload?.unavailable_count ?? 0) > 0 && (
          <p className="text-xs text-ink-muted mt-4">Results for {payload?.unavailable_count} linked student(s) could not be loaded.</p>
        )}
      </div>
    </div>
  )
}