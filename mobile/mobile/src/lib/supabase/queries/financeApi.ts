import { supabase } from '../client'

const API_BASE = 'https://results.eduxellence.org'

async function authedFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}`, ...options.headers },
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

export interface Term { id: string; name: string; sessionName: string }
export interface FeeStructure { id: string; name: string; termId: string; groupId: string | null; groupName: string }

export async function loadFeeStructuresContext(orgId: string): Promise<{ terms: Term[]; groups: { id: string; name: string }[]; structures: FeeStructure[] }> {
  const { data: terms } = await supabase.from('terms').select('id, name, session_id, academic_sessions(name)').eq('organization_id', orgId).order('start_date', { ascending: false })
  const { data: groups } = await supabase.from('groups').select('id, name').eq('organization_id', orgId).eq('type', 'class').eq('is_active', true).order('name')
  const { data: structures } = await supabase.from('fee_structures').select('id, name, term_id, group_id, groups(name)').eq('organization_id', orgId)

  return {
    terms: (terms ?? []).map((t: any) => ({ id: t.id, name: t.name, sessionName: t.academic_sessions?.name ?? '' })),
    groups: groups ?? [],
    structures: (structures ?? []).map((s: any) => ({ id: s.id, name: s.name, termId: s.term_id, groupId: s.group_id, groupName: s.groups?.name ?? 'All Classes' })),
  }
}

export interface BulkIssuePreview { studentCount: number; alreadyInvoicedCount: number; willSkip: number; eligibleCount: number; structureTotal: number; totalValue: number }

export async function previewBulkIssue(groupId: string, feeStructureId: string, override: boolean): Promise<BulkIssuePreview> {
  return authedFetch(`/api/admin/finance/invoices/bulk-issue/preview?groupId=${groupId}&feeStructureId=${feeStructureId}&override=${override}`)
}

export interface BulkIssueResult { invoicesCreated: number; skipped: number; failed: number; failedDetails: { learner_id: string; error: string }[] }

export async function bulkIssueInvoices(groupId: string, feeStructureId: string, override: boolean): Promise<BulkIssueResult> {
  const data = await authedFetch('/api/admin/finance/invoices/bulk-issue', { method: 'POST', body: JSON.stringify({ groupId, feeStructureId, override }) })
  return { invoicesCreated: data.invoicesCreated, skipped: data.skipped, failed: data.failed, failedDetails: data.failedDetails }
}

export interface StudentLedger {
  hasAccount: boolean
  accountId?: string
  lineItems?: { id: string; description: string; amount: number; dueDate: string | null; categoryName: string }[]
  payments?: { id: string; amount: number; method: string; reference: string | null; paid_date: string; status: string; voided: boolean; void_reason: string | null }[]
  balance?: { totalCharged: number; totalAdjusted: number; totalPaid: number; outstanding: number }
}

export async function loadStudentLedger(learnerId: string, termId: string): Promise<StudentLedger> {
  return authedFetch(`/api/admin/finance/student-ledger?learnerId=${learnerId}&termId=${termId}`)
}

export async function recordPayment(params: { accountId: string; amount: number; method: string; reference: string | null; paidDate: string }): Promise<{ warning?: string }> {
  return authedFetch('/api/admin/finance/payments', { method: 'POST', body: JSON.stringify(params) })
}

export async function voidPayment(paymentId: string, reason: string): Promise<void> {
  await authedFetch(`/api/admin/finance/payments/${paymentId}/void`, { method: 'POST', body: JSON.stringify({ reason }) })
}