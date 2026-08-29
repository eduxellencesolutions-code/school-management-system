// src/app/(dashboard)/fees/structures/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FeeStructureBuilder from '@/components/fees/FeeStructureBuilder'
import NeedHelp from '@/components/support/NeedHelp'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export default async function FeeStructuresPage() {
  const supabase = await createClient()
  const { user: authUser } = await getAuthenticatedUser(supabase)
  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', authUser.id)
    .single()

  if (!user?.organization_id) redirect('/dashboard')

  // Same pattern as the ledger page: admin bypasses, otherwise check the
  // 'fees.manage_structures' permission (already in RolesManager's catalog).
  const { data: canManage } = await supabase.rpc('has_permission', {
    p_user_id: authUser.id,
    p_permission_key: 'fees.manage_structures',
  })
  if (user.role !== 'admin' && !canManage) redirect('/dashboard')

  const { data: org } = await supabase
    .from('organizations')
    .select('current_term_id')
    .eq('id', user.organization_id)
    .single()

  const { data: terms } = await supabase
    .from('terms')
    .select('id, name, session_id, academic_sessions(name)')
    .eq('organization_id', user.organization_id)
    .order('start_date', { ascending: false })

  const { data: groups } = await supabase
    .from('groups')
    .select('id, name')
    .eq('organization_id', user.organization_id)
    .eq('type', 'class')
    .eq('is_active', true)
    .order('name')

  const { data: categories } = await supabase
    .from('finance_categories')
    .select('id, name')
    .or(`organization_id.is.null,organization_id.eq.${user.organization_id}`)
    .order('name')

  const formattedTerms = (terms ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
    sessionName: t.academic_sessions?.name ?? '',
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="page-title">Fee Structures</h1>
          <NeedHelp text="Set up fee structures and start recording payments." />
        </div>
        <p className="page-subtitle">
          Define what&apos;s charged per class per term. Once a structure has been issued to students, it&apos;s locked.
        </p>
      </div>

      {!terms || terms.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-muted">
          No academic terms found. Set up a term before creating fee structures.
        </div>
      ) : (
        <FeeStructureBuilder
          terms={formattedTerms}
          groups={groups ?? []}
          categories={categories ?? []}
          defaultTermId={org?.current_term_id ?? null}
        />
      )}
    </div>
  )
}