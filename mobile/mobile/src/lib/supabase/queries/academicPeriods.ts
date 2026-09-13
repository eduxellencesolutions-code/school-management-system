import { supabase } from '../client'

export interface AcademicSession { id: string; name: string }
export interface Term { id: string; name: string; sessionId: string; sessionName: string; isCurrent: boolean }

export async function loadAcademicPeriods(orgId: string): Promise<{ sessions: AcademicSession[]; terms: Term[]; currentTermId: string | null }> {
  const { data: sessions, error: sessionsError } = await supabase
    .from('academic_sessions').select('id, name').eq('organization_id', orgId).order('name', { ascending: false })
  if (sessionsError) throw new Error('Could not load academic sessions.')

  const sessionIds = (sessions ?? []).map((s) => s.id)
  const { data: terms, error: termsError } = sessionIds.length
    ? await supabase.from('terms').select('id, name, session_id').in('session_id', sessionIds).order('name')
    : { data: [], error: null }
  if (termsError) throw new Error('Could not load terms.')

  const { data: org } = await supabase.from('organizations').select('current_term_id').eq('id', orgId).single()
  const sessionNameById = new Map((sessions ?? []).map((s) => [s.id, s.name]))

  return {
    sessions: sessions ?? [],
    terms: (terms ?? []).map((t) => ({
      id: t.id, name: t.name, sessionId: t.session_id,
      sessionName: sessionNameById.get(t.session_id) ?? '', isCurrent: t.id === org?.current_term_id,
    })),
    currentTermId: org?.current_term_id ?? null,
  }
}

export async function createSession(orgId: string, name: string): Promise<void> {
  const { error } = await supabase.from('academic_sessions').insert({ organization_id: orgId, name: name.trim(), is_active: true })
  if (error) throw new Error('Could not create session.')
}

export async function createTerm(orgId: string, sessionId: string, name: string, startDate: string, endDate: string): Promise<void> {
  const { error } = await supabase.from('terms').insert({
    organization_id: orgId, session_id: sessionId, name: name.trim(), start_date: startDate, end_date: endDate, is_active: true,
  })
  if (error) throw new Error('Could not create term.')
}

export async function setCurrentTerm(orgId: string, termId: string | null): Promise<void> {
  const { error } = await supabase.from('organizations').update({ current_term_id: termId }).eq('id', orgId)
  if (error) throw new Error('Could not update current term.')
}

export async function closeTermRpc(termId: string, force = false): Promise<{ closed: boolean; blockers: any[]; warnings: any[] }> {
  const { data, error } = await supabase.rpc('close_term', { p_term_id: termId, p_force: force })
  if (error) throw new Error(error.message)
  return data
}

export async function closeSessionRpc(sessionId: string): Promise<{ closed: boolean; blockers: any[] }> {
  const { data, error } = await supabase.rpc('close_session', { p_session_id: sessionId })
  if (error) throw new Error(error.message)
  return data
}

export async function archiveTerm(termId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('terms').update({
    status: 'archived', is_active: false, closed_at: new Date().toISOString(), closed_by: userId,
  }).eq('id', termId)
  if (error) throw new Error('Could not archive term.')
}

export async function archiveSession(sessionId: string, userId: string): Promise<void> {
  await supabase.from('terms').update({
    status: 'archived', is_active: false, closed_at: new Date().toISOString(), closed_by: userId,
  }).eq('session_id', sessionId)
  const { error } = await supabase.from('academic_sessions').update({
    status: 'archived', is_active: false, closed_at: new Date().toISOString(), closed_by: userId,
  }).eq('id', sessionId)
  if (error) throw new Error('Could not archive session.')
}