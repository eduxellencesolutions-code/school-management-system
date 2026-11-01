import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getPortalContext } from '@/lib/domains/portalContext'

export const getSupportConfig = cache(async () => {
  const portal = await getPortalContext()
  if (portal.isPlatformHost) return { mode: 'platform' as const }
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_public_support_config', { p_hostname: portal.hostname })
  const cfg = data as { provider: string; property_id: string; widget_id: string } | null
  if (cfg?.provider === 'tawk' && cfg.property_id && cfg.widget_id) {
    return { mode: 'tenant' as const, propertyId: cfg.property_id, widgetId: cfg.widget_id }
  }
  return { mode: 'none' as const }   // a tenant host with no connector shows no chat, never your platform inbox
})