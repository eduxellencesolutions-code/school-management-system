import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FeesManager from '@/components/fees/FeesManager'

export default async function FeesPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', authUser.id)
    .single()

  if (!user?.organization_id) redirect('/dashboard')
  if (user.role !== 'admin') redirect('/dashboard')

  const { data: classes } = await supabase
    .from('groups')
    .select('id, name')
    .eq('organization_id', user.organization_id)
    .eq('type', 'class')
    .eq('is_active', true)
    .order('name')

  const { data: org } = await supabase
    .from('organizations')
    .select('current_term_id')
    .eq('id', user.organization_id)
    .single()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Fees</h1>
        <p className="page-subtitle">Track fee balances per student for the current term.</p>
      </div>

      {!classes || classes.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-muted">No classes found.</div>
      ) : (
        <FeesManager classes={classes} termId={org?.current_term_id ?? null} />
      )}
    </div>
  )
}