// src/app/access/layout.tsx
import { getPortalContext } from '@/lib/domains/portalContext'

export default async function AccessLayout({ children }: { children: React.ReactNode }) {
  const portal = await getPortalContext()
  const showInstitutionBranding = !!portal.organizationId
  const primaryColor = portal.colors?.primary

  if (!showInstitutionBranding) {
    return <>{children}</>
  }

  // Injects a small institution header ABOVE the page's own self-contained
  // centered card, rather than wrapping/duplicating that card's layout.
  return (
    <div className="pt-6 text-center">
      <h1
        className="text-lg font-bold text-ink"
        style={primaryColor ? { color: primaryColor } : undefined}
      >
        {portal.orgName}
      </h1>
      <p className="text-xs text-ink-muted mt-1 mb-2">Powered by Eduxellence Results</p>
      {children}
    </div>
  )
}