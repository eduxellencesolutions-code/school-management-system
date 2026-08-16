'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Printer } from 'lucide-react'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://eduxellence.org'

// Same pricing PLAN_PRICES was duplicating elsewhere — reused here too,
// not a third copy of the numbers.
import { PRICING } from '@/lib/payments/pricing'

interface CampaignStatus {
  slots_max: number
  slots_claimed: number
  slots_remaining: number
  is_active: boolean
  qualifying_price: number
}

function FlyerContent() {
  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref')
  const [campaign, setCampaign] = useState<CampaignStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.rpc('get_public_campaign_status', { p_campaign_key: 'founding_500' })
      setCampaign(data)
      setLoading(false)
    }
    load()
  }, [])

  if (!refCode) {
    return (
      <div className="max-w-md mx-auto mt-24 text-center px-4">
        <p className="text-ink-muted">
          This flyer needs a representative referral code to display correctly.
          Try the link again, or contact whoever shared it with you.
        </p>
      </div>
    )
  }

  const signupUrl = `${SITE_URL}/signup?ref=${refCode}`

  return (
    <div className="min-h-screen bg-white">
      <div className="print:hidden border-b border-surface-200 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-ink">
          Eduxellence <span className="text-brand-500">Results</span>
        </Link>
        <button
          onClick={() => window.print()}
          className="btn-primary btn-sm btn inline-flex items-center gap-2"
        >
          <Printer size={16} /> Print / Save as PDF
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-8 py-12 print:py-4">
        <div className="text-center mb-10 print:mb-6">
          <p className="text-sm font-semibold text-brand-600 uppercase tracking-wide">Eduxellence Results</p>
          <h1 className="text-3xl font-bold text-ink mt-2">Founding 500 Campaign</h1>
          <p className="text-ink-muted mt-3">
            A complete academic operating system for African schools — results, attendance,
            homework, fees, parent access, and staff permissions, all in one platform.
          </p>
        </div>

        <div className="bg-brand-50 border border-brand-200 rounded-xl p-6 mb-8 text-center print:break-inside-avoid">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-700">The Founding 500 Offer</p>
          <p className="text-2xl font-bold text-ink mt-2">
            {loading || !campaign ? '₦2,000' : `₦${campaign.qualifying_price.toLocaleString()}`}
          </p>
          <p className="text-sm text-ink-muted mt-1">One-time commitment for your first term</p>
          <div className="flex flex-col gap-2 mt-4 text-sm text-left max-w-sm mx-auto">
            <div className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
              <span>Full Premium features for your school's current academic term</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
              <span>Recognized as a Founding School — one of the first 500 on the platform</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
              <span>Continue on a regular plan after your founding term ends, at no obligation</span>
            </div>
          </div>
          {!loading && campaign && (
            <p className="text-xs text-ink-faint mt-4">
              {campaign.slots_remaining > 0
                ? `${campaign.slots_remaining} of ${campaign.slots_max} founding slots remaining`
                : 'All founding slots have been claimed'}
            </p>
          )}
        </div>

        <div className="text-center mb-8 print:break-inside-avoid">
          <p className="text-sm font-semibold text-ink mb-4">Join through this referral code</p>
          <div className="inline-block p-4 bg-white border border-surface-200 rounded-lg">
            <QRCodeSVG value={signupUrl} size={160} />
          </div>
          <p className="text-xs text-ink-faint mt-3">Scan to sign up</p>
          <p className="text-sm font-mono font-bold text-ink mt-2">
            Founding 500 Referral Code: {refCode}
          </p>
          <p className="text-xs text-ink-faint mt-1 break-all">{signupUrl}</p>
        </div>

        <div className="border-t border-surface-200 pt-6 mb-8 print:break-inside-avoid">
          <p className="text-sm font-semibold text-ink mb-2">After Your Founding Term</p>
          <p className="text-sm text-ink-muted">
            Continue with the plan that fits your school — from Free to Premium School,
            with pricing starting at ₦{PRICING.small_school.NGN.termly.toLocaleString()} per term.
          </p>
        </div>

        <div className="border-t border-surface-200 pt-6 mb-8 print:break-inside-avoid">
          <p className="text-sm font-semibold text-ink mb-2">Become a Representative</p>
          <p className="text-sm text-ink-muted">
            Help schools in your community discover Eduxellence and earn commission for every
            qualified referral. Visit <span className="font-medium">/representative-program</span> to learn more and apply.
          </p>
        </div>

        <div className="border-t border-surface-200 pt-6 text-center">
          <p className="text-sm font-semibold text-ink mb-1">Need Help?</p>
          <p className="text-xs text-ink-faint">
            Chat with us at eduxellence.org, or visit our Help Centre at eduxellence.org/help
          </p>
        </div>
      </div>
    </div>
  )
}

export default function FlyerPage() {
  return (
    <Suspense fallback={null}>
      <FlyerContent />
    </Suspense>
  )
}