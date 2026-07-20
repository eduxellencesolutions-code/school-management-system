import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Mail, Calendar, Signature } from 'lucide-react'
import MySignatureUpload from '@/components/settings/MySignatureUpload'

export default async function ProfileSettingsPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, name, email, role, signature_url, created_at, organization_id')
    .eq('id', authUser.id)
    .single()

  if (!profile) redirect('/login')

  // Check if user is in an institution
  const isInstitution = !!profile.organization_id

  // Fetch organization name if applicable
  let orgName = null
  if (isInstitution) {
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', profile.organization_id)
      .single()
    orgName = org?.name
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/settings" className="text-ink-muted hover:text-ink flex items-center gap-1">
          <ArrowLeft size={13} /> Settings
        </Link>
        <span className="text-ink-faint">/</span>
        <span className="text-ink font-medium">Profile</span>
      </div>

      <div>
        <h1 className="page-title">Profile Settings</h1>
        <p className="page-subtitle">Manage your personal information and signature</p>
      </div>

      {/* Personal Information */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <User size={16} className="text-brand-500" />
          <h2 className="font-semibold text-sm text-ink">Personal Information</h2>
        </div>
        <div className="card-body flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
              <User size={16} className="text-ink-faint shrink-0" />
              <div>
                <p className="text-xs text-ink-faint">Full Name</p>
                <p className="text-sm text-ink font-medium">{profile.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
              <Mail size={16} className="text-ink-faint shrink-0" />
              <div>
                <p className="text-xs text-ink-faint">Email</p>
                <p className="text-sm text-ink font-medium">{profile.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
              <span className="text-ink-faint text-sm font-medium shrink-0">Role</span>
              <div>
                <p className="text-sm text-ink font-medium capitalize">{profile.role}</p>
              </div>
            </div>
            {orgName && (
              <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
                <span className="text-ink-faint text-sm font-medium shrink-0">Organization</span>
                <div>
                  <p className="text-sm text-ink font-medium">{orgName}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
              <Calendar size={16} className="text-ink-faint shrink-0" />
              <div>
                <p className="text-xs text-ink-faint">Member since</p>
                <p className="text-sm text-ink font-medium">
                  {new Date(profile.created_at).toLocaleDateString('en-NG', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Teacher Signature - Only show for teachers (not admins in institutions) */}
      {profile.role === 'teacher' && (
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Signature size={16} className="text-brand-500" />
            <h2 className="font-semibold text-sm text-ink">Teacher Signature</h2>
          </div>
          <div className="card-body flex flex-col gap-3">
            <p className="text-xs text-ink-muted">
              Upload your signature. It will appear on report cards for classes where you are the class teacher.
            </p>
            <MySignatureUpload currentSignatureUrl={profile.signature_url} />
          </div>
        </div>
      )}

      {/* Help text for admins */}
      {profile.role === 'admin' && (
        <div className="card bg-surface-50 border-surface-200">
          <div className="card-body">
            <p className="text-xs text-ink-muted">
              <span className="font-medium">Note:</span> As an administrator, your signature is managed at the 
              organization level. You can update the principal signature in{' '}
              <Link href="/settings/institution" className="text-brand-500 hover:underline">
                Institution Settings
              </Link>
              .
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
