import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PLAN_PRICING, PLAN_LIMITS, type SubscriptionPlan } from '@/types'
import { CheckCircle2, XCircle, FileSliders, BookOpen, User, Mail, Phone, Building, Calendar, Crown } from 'lucide-react'
import Link from 'next/link'
import UpgradeButton from '@/components/billing/UpgradeButton'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*, organization:organizations!users_organization_id_fkey(*)')
    .eq('id', authUser.id)
    .single()
  
  const org = profile?.organization

  const currentPlan = (org?.subscription_plan ?? 'free') as SubscriptionPlan
  const planInfo = PLAN_PRICING[currentPlan]
  const planLimits = PLAN_LIMITS[currentPlan]

  const isInstitution = !!org
  const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account, subscription, and assessment configuration</p>
      </div>

      {/* Profile */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <User size={16} className="text-brand-500" />
          <h2 className="font-semibold text-sm text-ink">Profile</h2>
        </div>
        <div className="card-body flex flex-col gap-4">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 text-lg font-bold flex items-center justify-center">
              {profile?.name?.slice(0, 2).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="font-semibold text-ink">{profile?.name}</p>
              <p className="text-sm text-ink-muted">{profile?.email}</p>
              <span className="badge badge-gray text-xs mt-1 capitalize">
                {profile?.role || 'User'}
                {isAdmin && <span className="ml-1 text-brand-500">(Admin)</span>}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
              <User size={16} className="text-ink-faint" />
              <div>
                <p className="text-xs text-ink-faint">Full Name</p>
                <p className="text-sm text-ink">{profile?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
              <Mail size={16} className="text-ink-faint" />
              <div>
                <p className="text-xs text-ink-faint">Email</p>
                <p className="text-sm text-ink">{profile?.email}</p>
              </div>
            </div>
            {profile?.phone && (
              <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
                <Phone size={16} className="text-ink-faint" />
                <div>
                  <p className="text-xs text-ink-faint">Phone</p>
                  <p className="text-sm text-ink">{profile?.phone}</p>
                </div>
              </div>
            )}
            {profile?.created_at && (
              <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
                <Calendar size={16} className="text-ink-faint" />
                <div>
                  <p className="text-xs text-ink-faint">Member since</p>
                  <p className="text-sm text-ink">{new Date(profile.created_at).toLocaleDateString('en-NG', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Organization - Only show for institutions */}
      {org && isInstitution && (
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Building size={16} className="text-brand-500" />
            <h2 className="font-semibold text-sm text-ink">Organization</h2>
          </div>
          <div className="card-body flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
                <Building size={16} className="text-ink-faint" />
                <div>
                  <p className="text-xs text-ink-faint">School Name</p>
                  <p className="text-sm text-ink font-medium">{org.school_name || org.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
                <Crown size={16} className="text-ink-faint" />
                <div>
                  <p className="text-xs text-ink-faint">Plan</p>
                  <p className="text-sm text-ink font-medium capitalize">{planInfo?.label || 'Free'}</p>
                </div>
              </div>
              {org.motto && (
                <div className="md:col-span-2 flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
                  <span className="text-sm text-ink italic">"{org.motto}"</span>
                </div>
              )}
              {org.address && (
                <div className="md:col-span-2 flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
                  <span className="text-sm text-ink-muted">{org.address}</span>
                </div>
              )}
            </div>
            
            {/* Quick action to Institution Settings for admins */}
            {isAdmin && (
              <div className="mt-2">
                <Link 
                  href="/settings/institution" 
                  className="btn-secondary btn-sm btn inline-flex items-center gap-2"
                >
                  <Building size={14} /> Manage School Branding & Settings
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assessment Configuration - Only show for institutions */}
      {isInstitution && isAdmin && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <FileSliders size={16} className="text-brand-500" />
              Assessment Configuration
            </h2>
          </div>
          <div className="card-body flex flex-col gap-3">
            <p className="text-xs text-ink-muted">
              Configure how scores are structured for your school. Each school sets their own templates and subjects.
            </p>
            <div className="flex flex-col gap-2">
              <Link 
                href="/settings/templates" 
                className="flex items-center justify-between p-3 border border-surface-200 rounded hover:border-brand-300 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                    <FileSliders size={16} className="text-brand-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">Assessment Templates</p>
                    <p className="text-xs text-ink-muted">Define scoring components (CA1, CA2, Exam) and max scores</p>
                  </div>
                </div>
                <span className="text-xs text-brand-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Manage →</span>
              </Link>
              
              <Link 
                href="/settings/subjects" 
                className="flex items-center justify-between p-3 border border-surface-200 rounded hover:border-brand-300 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                    <BookOpen size={16} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">Subjects</p>
                    <p className="text-xs text-ink-muted">Add subjects to classes and assign assessment templates</p>
                  </div>
                </div>
                <span className="text-xs text-brand-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Manage →</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Billing Section - with id="billing" for anchor navigation */}
      {isInstitution && (
        <div id="billing" className="card scroll-mt-20">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <Crown size={16} className="text-brand-500" />
              Subscription & Billing
            </h2>
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
                { label: `${planLimits?.max_groups === null ? 'Unlimited' : planLimits?.max_groups} classes`, enabled: true },
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
                        <UpgradeButton planKey={key} label={info.label} />
                      </div>
                    ))}
                </div>
                <p className="text-xs text-ink-faint mt-3">
                  Contact us to upgrade: <a href="mailto:billing@eduxellence.org" className="text-brand-500 hover:underline">billing@eduxellence.org</a>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
