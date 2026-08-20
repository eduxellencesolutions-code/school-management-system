import { CheckCircle2, XCircle, ShieldCheck } from 'lucide-react'

async function getVerification(code: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const res = await fetch(`${siteUrl}/api/verify/${code}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const data = await getVerification(code)

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="card p-6 max-w-sm w-full text-center">
        <ShieldCheck size={32} className="text-brand-500 mx-auto mb-2" />
        <h1 className="text-lg font-bold text-ink mb-4">Eduxellence Representative Verification</h1>

        {!data?.found ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <XCircle size={40} className="text-red-500" />
            <p className="text-sm text-ink-muted">No representative found with ID <span className="font-mono">{code}</span>.</p>
          </div>
        ) : (
          <div className="text-left space-y-3">
            <div className="flex items-center gap-2 justify-center mb-2">
              {data.status === 'active' && data.photoApproved ? (
                <CheckCircle2 size={24} className="text-green-600" />
              ) : (
                <XCircle size={24} className="text-amber-500" />
              )}
              <span className="text-sm font-semibold">
                {data.status === 'active' && data.photoApproved ? 'Verified Representative' : 'Unverified / Inactive'}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-ink-faint">Name</dt><dd className="text-ink font-medium">{data.fullName}</dd>
              <dt className="text-ink-faint">Representative ID</dt><dd className="text-ink font-mono">{data.referralCode}</dd>
              <dt className="text-ink-faint">Designation</dt><dd className="text-ink">{data.designation}</dd>
              <dt className="text-ink-faint">Status</dt><dd className="text-ink capitalize">{data.status}</dd>
              <dt className="text-ink-faint">Organization</dt><dd className="text-ink">{data.organization}</dd>
            </dl>
          </div>
        )}

        <p className="text-xs text-ink-faint mt-4">This page confirms representative identity only. It does not disclose contact or financial information.</p>
      </div>
    </div>
  )
}
