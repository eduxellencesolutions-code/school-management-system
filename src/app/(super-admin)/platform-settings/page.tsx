import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoUploadSettings from '@/components/super-admin/LogoUploadSettings'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
  if (!isSuperAdmin) redirect('/dashboard')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Platform Settings</h1>
        <p className="text-sm text-ink-muted mt-1">Company branding, representative rules, and platform-wide configuration</p>
      </div>

      <LogoUploadSettings />

      {/* Future sections, added as they are built:
          - Company Information
          - Representative Settings
          - Commission / Growth Level Settings
          - Campaign Settings
          - Payment Configuration
          - Platform-wide Branding
      */}
    </div>
  )
}
