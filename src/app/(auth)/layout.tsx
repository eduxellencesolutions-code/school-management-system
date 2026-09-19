import Image from 'next/image'
import { getPortalContext } from '@/lib/domains/portalContext'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const portal = await getPortalContext()
  const showInstitutionBranding = !!portal.organizationId
  const primaryColor = portal.colors?.primary

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {showInstitutionBranding ? (
            <>
              {portal.logoUrl && (
                <div className="flex justify-center mb-3">
                  <Image
                    src={portal.logoUrl}
                    alt={portal.orgName ?? 'Institution logo'}
                    width={56}
                    height={56}
                    className="rounded object-contain"
                  />
                </div>
              )}
              <h1
                className="text-2xl font-bold text-ink"
                style={primaryColor ? { color: primaryColor } : undefined}
              >
                {portal.orgName}
              </h1>
              <p className="text-sm text-ink-muted mt-1">
                Powered by Eduxellence Results
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-ink">
                Eduxellence <span className="text-brand-500">Results</span>
              </h1>
              <p className="text-sm text-ink-muted mt-1">Smart academic result management</p>
            </>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}