// src/components/domains/WrongPortalNotice.tsx
import Link from 'next/link'

export default function WrongPortalNotice({
  orgId,
  orgName,
  correctPortalHref,
}: {
  orgId: string | null
  orgName: string | null
  correctPortalHref: string
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 px-4">
      <div className="card p-8 w-full max-w-md text-center">
        <h1 className="text-lg font-bold text-ink mb-2">This isn't your portal</h1>
        <p className="text-sm text-ink-muted mb-6">
          {orgName
            ? `This address belongs to ${orgName}'s portal, but your account is registered with a different institution.`
            : 'Your account is registered with a different institution than this portal.'}
        </p>
        <div className="flex flex-col gap-2">
          <Link href={correctPortalHref} className="btn-primary btn">
            Go to my portal
          </Link>
          <Link href="/login" className="btn-secondary btn text-sm">
            Sign in with a different account
          </Link>
        </div>
      </div>
    </div>
  )
}