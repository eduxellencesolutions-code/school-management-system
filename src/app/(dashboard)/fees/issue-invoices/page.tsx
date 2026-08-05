// src/app/(dashboard)/fees/issue-invoices/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BulkInvoiceIssuer from '@/components/fees/BulkInvoiceIssuer'

export default async function IssueInvoicesPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', authUser.id)
    .single()

  if (!user?.organization_id) redirect('/dashboard')

  const { data: canIssue } = await supabase.rpc('has_permission', {
    p_user_id: authUser.id,
    p_permission_key: 'finance.issue_invoices',
  })
  if (user.role !== 'admin' && !canIssue) redirect('/dashboard')

  const { data: canOverride } = await supabase.rpc('has_permission', {
    p_user_id: authUser.id,
    p_permission_key: 'finance.override_duplicate_invoice',
  })

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

  const { data: structures } = await supabase
    .from('fee_structures')
    .select('id, name, term_id, group_id, groups(name)')
    .eq('organization_id', user.organization_id)

  const formattedTerms = (terms ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
    sessionName: t.academic_sessions?.name ?? '',
  }))

  const formattedStructures = (structures ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    termId: s.term_id,
    groupId: s.group_id,
    groupName: s.groups?.name ?? 'All Classes',
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Issue Invoices</h1>
        <p className="page-subtitle">Issue a fee structure to an entire class at once.</p>
      </div>

      {!terms || terms.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-muted">No academic terms found.</div>
      ) : !groups || groups.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-muted">No classes found.</div>
      ) : (
        <BulkInvoiceIssuer
          terms={formattedTerms}
          groups={groups}
          structures={formattedStructures}
          canOverride={user.role === 'admin' || !!canOverride}
        />
      )}
    </div>
  )
}