import Image from 'next/image'
import { getPortalContext } from '@/lib/domains/portalContext'

// Converts a hex color to an rgba() string at a given opacity, for a soft
// background tint that doesn't fight with the white sign-in card's contrast.
function hexToRgba(hex: string | undefined, alpha: number): string | undefined {
  if (!hex) return undefined
  const clean = hex.replace('#', '')
  const bigint = parseInt(clean, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const portal = await getPortalContext()
  const showInstitutionBranding = !!portal.organizationId
  const primaryColor = portal.colors?.primary
  const secondaryColor = portal.colors?.secondary

  const pageBackground =
    showInstitutionBranding && primaryColor
      ? {
          background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.08)}, ${hexToRgba(secondaryColor ?? primaryColor, 0.08)})`,
        }
      : undefined

  return (
    <div
      className="min-h-screen bg-surface-50 flex items-center justify-center p-4"
      style={pageBackground}
    >
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

        {showInstitutionBranding && primaryColor ? (
          <div
            className="rounded-t-lg h-1.5 -mb-px"
            style={{ background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor ?? primaryColor})` }}
          />
        ) : null}

        {children}
      </div>
    </div>
  )
}