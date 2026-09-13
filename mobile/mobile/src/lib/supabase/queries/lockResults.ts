import { supabase } from '../client'

const API_BASE = 'https://results.eduxellence.org'

async function authedFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}`, ...options.headers },
  })
  return res.json()
}

export interface ClassLockSummary {
  groupId: string; groupName: string
  reportId: string | null; reportStatus: string | null; locked: boolean; lockedAt: string | null
  sessionId: string | null; termId: string | null
}

export async function loadClassLockSummaries(orgId: string): Promise<ClassLockSummary[]> {
  const { data: classes } = await supabase.from('groups').select('id, name').eq('organization_id', orgId).eq('type', 'class').eq('is_active', true).order('name')
  if (!classes) return []

  return Promise.all(classes.map(async (cls) => {
    const { data: report } = await supabase
      .from('reports')
      .select('id, report_status, locked, locked_at, session_id, term_id')
      .eq('group_id', cls.id).eq('type', 'broadsheet').eq('deleted', false)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()

    return {
      groupId: cls.id, groupName: cls.name,
      reportId: report?.id ?? null, reportStatus: report?.report_status ?? null,
      locked: report?.locked ?? false, lockedAt: report?.locked_at ?? null,
      sessionId: report?.session_id ?? null, termId: report?.term_id ?? null,
    }
  }))
}

export async function checkLockReadiness(groupId: string, sessionId: string, termId: string): Promise<{ ready: boolean; problems?: string[] }> {
  const data = await authedFetch('/api/reports/lock', { method: 'POST', body: JSON.stringify({ groupId, sessionId, termId, dryRun: true }) })
  if (data.error && !data.ready === undefined) throw new Error(data.error)
  return { ready: !!data.ready, problems: data.problems }
}

export async function confirmLock(groupId: string, sessionId: string, termId: string): Promise<void> {
  const data = await authedFetch('/api/reports/lock', { method: 'POST', body: JSON.stringify({ groupId, sessionId, termId }) })
  if (data.error) throw new Error(data.error)
}