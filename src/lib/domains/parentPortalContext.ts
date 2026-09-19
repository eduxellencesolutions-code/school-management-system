// src/lib/domains/parentPortalContext.ts
//
// Parents can have children at more than one institution, so there is no
// single "session organization" to compare a portal against — this is a
// separate comparison from comparePortalToSession() in portalContext.ts.

import { createClient } from '@/lib/supabase/server'
import type { PortalContext, PortalMatch } from './portalContext'

export async function getParentLinkedOrganizationIds(): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('learners')
    .select('organization_id')
    .in(
      'id',
      (await supabase.rpc('get_my_linked_learner_ids')).data ?? []
    )

  if (error || !data) return []

  return [...new Set(data.map(r => r.organization_id).filter(Boolean))] as string[]
}

export async function comparePortalToParentSession(
  portal: PortalContext
): Promise<PortalMatch> {
  if (portal.isPlatformHost) return 'platform'
  if (!portal.organizationId) return 'unknown_host'

  const linkedOrgIds = await getParentLinkedOrganizationIds()

  if (linkedOrgIds.length === 0) return 'anonymous'

  return linkedOrgIds.includes(portal.organizationId) ? 'match' : 'mismatch'
}