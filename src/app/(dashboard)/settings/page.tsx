import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getPlanConfig, PlanKey } from '@/lib/plans/config'
import { CheckCircle2, XCircle, FileSliders, BookOpen, User, Mail, Phone, Building, Calendar, Crown, Signature } from 'lucide-react'
import Link from 'next/link'
import PlanUpgradeCard from '@/components/billing/PlanUpgradeCard'
import PlanDowngradeCard from '@/components/billing/PlanDowngradeCard'
import { getUpgradeOptions, getDowngradeOptions } from '@/lib/plans/downgrade'
import { PaidPlan } from '@/lib/payments/pricing'
import MySignatureUpload from '@/components/settings/MySignatureUpload'

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
  const isInstitution = !!org

  // ✅ Solo teachers carry their own subscription_plan/status on users;
  // institutions carry it on organizations.
  const currentPlan = (isInstitution ? org?.subscription_plan : profile?.subscription_plan) as PlanKey ?? 'free'
  const currentStatus = (isInstitution ? org?.subscription_status : profile?.subscription_status) ?? 'active'
  const config = getPlanConfig(currentPlan)

  const isAdmin = profile?.role === 'admin'

  // ✅ Check if current plan is a paid plan (not 'free')
  const isPaidPlan = currentPlan !== 'free'

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

          {/* ✅ Teacher Signature Upload - Only show for teachers (not admins) */}
          {profile?.role === 'teacher' && (
            <div className="mt-4 pt-4 border-t border-surface-200">
              <div className="flex items-center gap-2 mb-3">
                <Signature size={16} className="text-brand-500" />
                <h3 className="font-medium text-sm text-ink">Teacher Signature</h3>
              </div>
              <p className="text-xs text-ink-muted mb-3">
                Upload your signature. It will appear on report cards for classes where you are the class teacher.
              </p>
              <MySignatureUpload currentSignatureUrl={profile?.signature_url} />
            </div>
          )}

          {/* ✅ Show note for admins */}
          {profile?.role === 'admin' && (
            <div className="mt-4 pt-4 border-t border-surface-200">
              <p className="text-xs text-ink-muted">
                <span className="font-medium">Note:</span> As an administrator, your signature is managed at the 
                organization level. You can update the principal signature in{' '}
                <Link href="/settings/institution" className="text-brand-500 hover:underline">
                  Institution Settings
                </Link>
                .
              </p>
            </div>
          )}
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
                  <p className="text-sm text-ink font-medium capitalize">{config.label}</p>
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

      {/* ✅ Billing Section - Shows for BOTH institutions AND solo teachers */}
      <div id="billing" className="card scroll-mt-20">
        <div className="card-header flex items-center justify-between">
          <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
            <Crown size={16} className="text-brand-500" />
            Subscription & Billing
          </h2>
          <span className="badge badge-blue capitalize">{config.label}</span>
        </div>
        <div className="card-body flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <span className={`badge ${currentStatus === 'active' ? 'badge-green' : currentStatus === 'trial' ? 'badge-blue' : 'badge-red'} capitalize`}>
              {currentStatus}
            </span>
            {(isInstitution ? org?.subscription_expires_at : profile?.subscription_expires_at) && (
              <span className="text-xs text-ink-muted">
                Renews / expires {new Date(isInstitution ? org.subscription_expires_at : profile.subscription_expires_at).toLocaleDateString('en-NG')}
              </span>
            )}
          </div>

          {/* Feature checklist — driven entirely by the plan config */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: `${config.limits.maxClasses === 'unlimited' ? 'Unlimited' : config.limits.maxClasses} classes`, enabled: true },
              { label: `${config.limits.maxStudents} students`, enabled: true },
              { label: 'Excel export', enabled: config.features.excelImportExport },
              { label: 'PDF reports', enabled: config.features.pdfReportCards },
              { label: 'School branding', enabled: config.features.schoolBranding === 'full' },
              { label: 'AI remarks', enabled: config.features.aiGeneratedRemarks },
              { label: 'Broadsheet generation', enabled: config.features.broadsheetGeneration },
              { label: 'Multiple teachers', enabled: config.features.teacherManagement },
              { label: 'Parent portal', enabled: config.features.parentPortal },
              { label: 'Student portal', enabled: config.features.studentPortal },
              { label: 'Online result checker', enabled: config.features.onlineResultChecker },
              { label: 'Priority support', enabled: config.features.prioritySupport !== 'community' },
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

          {/* ✅ Restructured upgrade/downgrade/renew section */}
          {(() => {
            // Get upgrade and downgrade options specific to this account type
            const allUpgrades = getUpgradeOptions(currentPlan, isInstitution)
            const upgrades = allUpgrades.filter(k => k !== 'free')
            const downgrades = getDowngradeOptions(currentPlan, isInstitution)

            return (
              <div className="border-t border-surface-200 pt-4 flex flex-col gap-5">
                {/* ✅ NEW: Show Renew option when expired or in grace period (only for paid plans) */}
                {(currentStatus === 'expired' || currentStatus === 'grace_period') && isPaidPlan && (
                  <div>
                    <p className="text-sm font-medium text-ink mb-3 text-red-600">
                      {currentStatus === 'expired' ? 'Renew Your Subscription' : 'Renew Before Grace Period Ends'}
                    </p>
                    <PlanUpgradeCard 
                      plan={currentPlan as PaidPlan} 
                      label={`${config.label} (Renew)`} 
                    />
                  </div>
                )}

                {upgrades.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-ink mb-3">Upgrade Available</p>
                    <div className="flex flex-col gap-3">
                      {upgrades.map(key => (
                        <PlanUpgradeCard key={key} plan={key as PaidPlan} label={getPlanConfig(key).label} />
                      ))}
                    </div>
                  </div>
                )}

                {downgrades.length > 0 ? (
                  <div>
                    <p className="text-sm font-medium text-ink mb-3">Downgrade Available</p>
                    <div className="flex flex-col gap-3">
                      {downgrades.map(key => (
                        <PlanDowngradeCard key={key} plan={key} label={getPlanConfig(key).label} />
                      ))}
                    </div>
                  </div>
                ) : currentPlan !== 'free' ? (
                  <p className="text-xs text-ink-faint">No lower paid plan available.</p>
                ) : null}
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
