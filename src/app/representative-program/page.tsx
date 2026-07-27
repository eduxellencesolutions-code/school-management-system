import Link from 'next/link'
import { Handshake, TrendingUp, Users, Wallet } from 'lucide-react'

export default function RepresentativeProgramPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-6 flex flex-col gap-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-50 text-brand-600 mb-4">
          <Handshake size={22} />
        </div>
        <h1 className="text-xl font-semibold text-ink mb-2">Become an Eduxellence Representative</h1>
        <p className="text-sm text-ink-muted">
          Earn commission by introducing schools and teachers to Eduxellence — no cost, no separate account needed.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="card p-4 flex gap-3">
          <Users size={18} className="text-brand-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-ink">Share your referral code</p>
            <p className="text-xs text-ink-muted mt-0.5">
              Every school or teacher who signs up using your code or link is tracked automatically.
            </p>
          </div>
        </div>
        <div className="card p-4 flex gap-3">
          <Wallet size={18} className="text-brand-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-ink">Earn commission</p>
            <p className="text-xs text-ink-muted mt-0.5">
              When a referred school or teacher subscribes to a paid plan, you earn a percentage — paid out after a short qualifying period.
            </p>
          </div>
        </div>
        <div className="card p-4 flex gap-3">
          <TrendingUp size={18} className="text-brand-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-ink">Grow your level</p>
            <p className="text-xs text-ink-muted mt-0.5">
              Qualify more schools and teachers to advance from Growth Volunteer toward Certified, State, and Zonal Representative.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-surface-50 border border-surface-200 rounded p-3 text-xs text-ink-muted">
        You keep your existing login — becoming a Representative adds a new dashboard tab, it doesn&apos;t replace your current one.
      </div>

      <Link href="/apply-representative" className="btn-primary btn text-center mt-2">
        Apply to become a Representative →
      </Link>
    </div>
  )
}