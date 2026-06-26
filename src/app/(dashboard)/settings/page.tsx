import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PLAN_PRICING, PLAN_LIMITS, type SubscriptionPlan } from '@/types'
import { CheckCircle2, XCircle } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()
  
  const { data: org } = profile?.organization_id
    ? await supabase.from('organizations').select('*').eq('id', profile.organization_id).single()
    : { data: null }

  // FIX: Type assertion to ensure it's a valid SubscriptionPlan
  const currentPlan = (org?.subscription_plan ?? 'free') as SubscriptionPlan
  const planInfo = PLAN_PRICING[currentPlan]
  const planLimits = PLAN_LIMITS[currentPlan]

  return (
    <div className="max-w-2xl flex flex-col gap-8">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and subscription</p>
      </div>

      {/* Profile */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-sm text-ink">Profile</h2>
        </div>
        <div className="card-body flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Full name</label>
              <p className="text-sm text-ink">{profile?.name}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Email</label>
              <p className="text-sm text-ink">{profile?.email}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Role</label>
              <p className="text-sm text-ink capitalize">{profile?.role}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Member since</label>
              <p className="text-sm text-ink">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-NG') : '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Organization */}
      {org && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-sm text-ink">Organization</h2>
          </div>
          <div className="card-body flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Name</label>
                <p className="text-sm text-ink">{org.name}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Type</label>
                <p className="text-sm text-ink capitalize">{org.type}</p>
              </div>
              {org.motto && (
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Motto</label>
                  <p className="text-sm text-ink italic">"{org.motto}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Current plan */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="font-semibold text-sm text-ink">Subscription</h2>
          <span className="badge badge-blue">{planInfo?.label}</span>
        </div>
        <div className="card-body flex flex-col gap-5">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-ink">{planInfo?.naira}</span>
            <span className="text-sm text-ink-muted">{planInfo?.period}</span>
          </div>

          {/* Feature checklist */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: `${planLimits?.max_groups === null ? 'Unlimited' : planLimits?.max_groups} class${planLimits?.max_groups === 1 ? '' : 'es'}`, enabled: true },
              { label: `${planLimits?.max_learners === null ? 'Unlimited' : planLimits?.max_learners} students`, enabled: true },
              { label: 'Excel export', enabled: planLimits?.has_excel_export ?? false },
              { label: 'PDF reports', enabled: planLimits?.has_pdf_export ?? false },
              { label: 'School branding', enabled: planLimits?.has_branding ?? false },
              { label: 'AI remarks', enabled: planLimits?.has_ai_remarks ?? false },
              { label: 'Analytics dashboard', enabled: planLimits?.has_analytics ?? false },
              { label: 'Multiple teachers', enabled: planLimits?.has_multi_staff ?? false },
              { label: 'Parent portal', enabled: planLimits?.has_parent_portal ?? false },
            ].map(({ label, enabled }) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                {enabled
                  ? <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                  : <XCircle size={14} className="text-surface-200 shrink-0" />
                }
                <span className={enabled ? 'text-ink' : 'text-ink-faint'}>{label}</span>
              </div>
            ))}
          </div>

          {/* Upgrade options */}
          {currentPlan !== 'premium_school' && (
            <div className="border-t border-surface-200 pt-4">
              <p className="text-sm font-medium text-ink mb-3">Upgrade your plan</p>
              <div className="flex flex-col gap-2">
                {Object.entries(PLAN_PRICING)
                  .filter(([key]) => key !== currentPlan && key !== 'free')
                  .map(([key, info]) => (
                    <div key={key} className="flex items-center justify-between p-3 border border-surface-200 rounded hover:border-brand-300 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-ink">{info.label}</p>
                        <p className="text-xs text-ink-muted">{info.naira} {info.period}</p>
                      </div>
                      <button className="btn-primary btn-sm btn">
                        Upgrade
                      </button>
                    </div>
                  ))}
              </div>
              <p className="text-xs text-ink-faint mt-3">
                Contact us to upgrade: <a href="mailto:billing@eduxellence.com" className="text-brand-500 hover:underline">billing@eduxellence.com</a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}