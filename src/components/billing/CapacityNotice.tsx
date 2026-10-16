// src/components/billing/CapacityNotice.tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const naira = (n: any) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Number(n))

export default function CapacityNotice({ orgId }: { orgId: string }) {
  const [s, setS] = useState<any>(null)
  useEffect(() => { createClient().rpc('get_capacity_status', { p_org_id: orgId }).then(({ data }) => setS(data)) }, [orgId])
  if (!s?.active_period) return null
  return (
    <section className="card p-5 flex flex-col gap-2 text-sm">
      <h2 className="font-semibold text-ink">Your plan capacity</h2>
      <p>Your plan covers up to <b>{s.purchased.capacity}</b> active students. You may go up to <b>{s.tolerance_limit}</b> (10% over) at no extra charge. You currently have <b>{s.verified_count}</b>.</p>
      {s.over_tolerance && s.proposed_topup ? (
        <p>Your count is above the allowance. A top-up to the {s.proposed_topup.to_plan.replace(/_/g, ' ')} plan would be about <b>{naira(s.proposed_topup.amount)}</b> for the {s.proposed_topup.remaining_days} of {s.proposed_topup.period_days} days left in your paid period, if it were issued today. If a top-up is ever issued it is due 14 days after its issue date.</p>
      ) : s.over_tolerance ? <p>Your count is above the allowance for any standard plan. Please contact Eduxellence for a reviewed arrangement.</p>
      : <p>You are within your allowance. Nothing is required.</p>}
      <p className="text-xs text-ink-muted">This is for information only. No top-up has been issued and nothing is restricted. Enrolment, access to your records, billing, support and exports are never affected.</p>
    </section>
  )
}