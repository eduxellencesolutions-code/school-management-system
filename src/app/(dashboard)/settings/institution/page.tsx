// FILE: src/app/(dashboard)/settings/institution/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { setInstitutionType, setGradingScale, setTertiaryPlan } from './actions'
import { useSearchParams, useRouter } from 'next/navigation'

interface Tier {
  tier_key: string
  name: string
  min_students: number
  max_students: number | null
  price_per_student_per_term: number | null
  is_custom: boolean
}

interface BillingEstimate {
  plan: string
  tier_name: string
  is_custom: boolean
  billing_cycle: string
  student_count: number
  price_per_student_per_term?: number
  termly_amount?: number
  annual_list_amount?: number
  annual_discount_rate?: number
  annual_discounted_amount?: number
  amount_due?: number
  note?: string
}

export default function InstitutionSettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const success = searchParams.get('success')

  const [orgType, setOrgType] = useState<string>('school')
  const [activeScale, setActiveScale] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [tiers, setTiers] = useState<Tier[]>([])
  const [currentTierKey, setCurrentTierKey] = useState<string | null>(null)
  const [currentBillingCycle, setCurrentBillingCycle] = useState<string>('termly')
  const [capabilities, setCapabilities] = useState<string[]>([])
  const [billingEstimate, setBillingEstimate] = useState<BillingEstimate | null>(null)
  const [billingLoading, setBillingLoading] = useState(true)
  const [selectedTierKey, setSelectedTierKey] = useState<string>('')
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<string>('termly')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('users')
        .select('organization_id, role')
        .eq('id', user.id)
        .single()
      if (!profile?.organization_id) return

      const { data: canManageBranding } = await supabase.rpc('has_permission', {
        p_user_id: user.id,
        p_permission_key: 'institution.manage_branding',
      })
      const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'
      if (!isAdmin && !canManageBranding) {
        router.replace('/dashboard')
        return
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('type, tertiary_plan, tertiary_billing_cycle')
        .eq('id', profile.organization_id)
        .single()
      if (org) {
        setOrgType(org.type)
        setCurrentTierKey(org.tertiary_plan)
        setCurrentBillingCycle(org.tertiary_billing_cycle ?? 'termly')
        setSelectedTierKey(org.tertiary_plan ?? '')
        setSelectedBillingCycle(org.tertiary_billing_cycle ?? 'termly')
      }

      const { data: scaleData } = await supabase.rpc('get_active_tertiary_scale', { p_org_id: profile.organization_id })
      setActiveScale(scaleData)
      setLoading(false)

      if (org?.type === 'university') {
        const { data: tierRows } = await supabase
          .from('tertiary_pricing_tiers')
          .select('tier_key, name, min_students, max_students, price_per_student_per_term, is_custom')
          .eq('is_active', true)
          .order('min_students')
        setTiers(tierRows ?? [])

        if (org.tertiary_plan) {
          const { data: capRows } = await supabase
            .from('tertiary_plan_capabilities')
            .select('capability_key')
            .eq('tier_key', org.tertiary_plan)
            .eq('is_enabled', true)
          setCapabilities((capRows ?? []).map(c => c.capability_key))

          const { data: estimate, error: estimateError } = await supabase.rpc('get_tertiary_billing_estimate', {
            p_org_id: profile.organization_id,
          })
          if (!estimateError) setBillingEstimate(estimate)
        }
        setBillingLoading(false)
      } else {
        setBillingLoading(false)
      }
    }
    load()
  }, [])

  const isTertiary = orgType === 'university'
  const naira = (n: number | null | undefined) =>
    n == null ? '—' : `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`

  return (
    <div className="max-w-lg">
      <h1 className="page-title mb-1">Institution Settings</h1>
      <p className="page-subtitle mb-6">Set your institution type and, for tertiary institutions, your grading scale and billing plan.</p>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"><p className="text-sm text-red-700">{decodeURIComponent(error)}</p></div>}
      {success && <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4"><p className="text-sm text-green-700">{decodeURIComponent(success)}</p></div>}

      <form action={setInstitutionType} className="card p-6 flex flex-col gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Institution type</label>
          <select name="type" defaultValue={orgType} className="input">
            <option value="school">Nursery, Primary & Secondary School</option>
            <option value="university">University / Polytechnic / College</option>
            <option value="centre">Tutorial Centre / Training Institute</option>
          </select>
        </div>
        <button type="submit" className="btn-primary btn">Save institution type</button>
      </form>

      {isTertiary && (
        <div className="card p-6 flex flex-col gap-4 mb-6">
          <div>
            <p className="text-sm font-medium text-ink mb-1">Current grading scale</p>
            {loading ? (
              <p className="text-xs text-ink-faint">Loading…</p>
            ) : activeScale ? (
              <p className="text-sm text-ink-muted">{activeScale.scale_type} — max {activeScale.max_point}.00</p>
            ) : (
              <p className="text-xs text-ink-faint">No grading scale configured yet.</p>
            )}
          </div>

          <form action={setGradingScale} className="flex flex-col gap-3">
            <label className="block text-sm font-medium text-ink mb-1">Select grading scale</label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="scale" value="4_point" defaultChecked={activeScale?.scale_type === 'tertiary_4_point'} />
                4-Point Scale (common for Polytechnics / Colleges of Education)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="scale" value="5_point" defaultChecked={activeScale?.scale_type === 'tertiary_5_point'} />
                5-Point Scale
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="scale" value="7_point" defaultChecked={activeScale?.scale_type === 'tertiary_7_point'} />
                7-Point Scale
              </label>
            </div>
            <button type="submit" className="btn-primary btn w-fit">Apply grading scale</button>
            <p className="text-xs text-ink-faint">
              Note: switching scales is blocked once results have been finalized in a session that's still open —
              close the current session first. Historical results always keep the scale that was active when they were finalized.
            </p>
          </form>
        </div>
      )}

      {isTertiary && (
        <div className="card p-6 flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-ink mb-1">Billing plan</p>
            {billingLoading ? (
              <p className="text-xs text-ink-faint">Loading…</p>
            ) : currentTierKey ? (
              <div className="flex flex-col gap-1">
                <p className="text-sm text-ink-muted">
                  {tiers.find(t => t.tier_key === currentTierKey)?.name ?? currentTierKey} · billed {currentBillingCycle}
                </p>
                {billingEstimate && !billingEstimate.note && (
                  <div className="text-xs text-ink-muted bg-surface-50 rounded p-3 mt-1 flex flex-col gap-1">
                    <span>{billingEstimate.student_count} active student{billingEstimate.student_count !== 1 ? 's' : ''} × {naira(billingEstimate.price_per_student_per_term)}/term</span>
                    <span>Termly amount: {naira(billingEstimate.termly_amount)}</span>
                    {billingEstimate.billing_cycle === 'annual' && (
                      <span>
                        Annual (prepaid, {Math.round((billingEstimate.annual_discount_rate ?? 0) * 100)}% discount vs paying termly): {naira(billingEstimate.annual_discounted_amount)}
                      </span>
                    )}
                    <span className="font-medium text-ink">Amount due this cycle: {naira(billingEstimate.amount_due)}</span>
                  </div>
                )}
                {billingEstimate?.note && (
                  <p className="text-xs text-ink-faint bg-surface-50 rounded p-3 mt-1">{billingEstimate.note}</p>
                )}
                {capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {capabilities.map(c => (
                      <span key={c} className="badge badge-blue text-[10px]">{c.replace('tertiary.', '').replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-ink-faint">No billing plan set yet.</p>
            )}
          </div>

          <form action={setTertiaryPlan} className="flex flex-col gap-3">
            <label className="block text-sm font-medium text-ink mb-1">Select plan</label>
            <div className="flex flex-col gap-2">
              {tiers.map(t => (
                <label key={t.tier_key} className="flex items-start gap-2 text-sm border border-surface-200 rounded-lg p-3 cursor-pointer hover:border-brand-300">
                  <input
                    type="radio"
                    name="tier_key"
                    value={t.tier_key}
                    checked={selectedTierKey === t.tier_key}
                    onChange={() => setSelectedTierKey(t.tier_key)}
                    className="mt-0.5"
                  />
                  <span className="flex-1">
                    <span className="font-medium text-ink block">{t.name}</span>
                    <span className="text-xs text-ink-muted">
                      {t.max_students ? `${t.min_students.toLocaleString()}–${t.max_students.toLocaleString()} students` : `${t.min_students.toLocaleString()}+ students`}
                      {' · '}
                      {t.is_custom ? 'Custom pricing — contact us' : `${naira(t.price_per_student_per_term)} / student / term`}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <label className="block text-sm font-medium text-ink mb-1 mt-2">Billing cycle</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio" name="billing_cycle" value="termly"
                  checked={selectedBillingCycle === 'termly'}
                  onChange={() => setSelectedBillingCycle('termly')}
                />
                Termly
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio" name="billing_cycle" value="annual"
                  checked={selectedBillingCycle === 'annual'}
                  onChange={() => setSelectedBillingCycle('annual')}
                />
                Annual (prepaid, discounted)
              </label>
            </div>

            <button type="submit" className="btn-primary btn w-fit mt-2" disabled={!selectedTierKey}>
              {currentTierKey ? 'Update billing plan' : 'Set billing plan'}
            </button>
            <p className="text-xs text-ink-faint">
              Institutions with finalized results in an open session cannot switch to a different tier until that session is closed.
            </p>
          </form>
        </div>
      )}
    </div>
  )
}