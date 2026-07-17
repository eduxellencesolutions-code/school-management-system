import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building, Image, PenTool, Users, FileText, Settings } from 'lucide-react'
import InstitutionSettings from '@/components/settings/InstitutionSettings'

export default async function InstitutionSettingsPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  // FIX: Added !users_organization_id_fkey to resolve ambiguous relation
  const { data: user } = await supabase
    .from('users').select('*, organization:organizations!users_organization_id_fkey(*)')
    .eq('id', authUser.id)
    .single()

  // Only institutions can access this
  if (!user?.organization_id) {
    redirect('/dashboard')
  }

  // Check if user is admin
  if (user?.role !== 'admin' && user?.role !== 'school_admin') {
    redirect('/dashboard')
  }

  const organization = user?.organization

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/settings" className="text-ink-muted hover:text-ink flex items-center gap-1">
          <ArrowLeft size={13} /> Settings
        </Link>
        <span className="text-ink-faint">/</span>
        <span className="text-ink font-medium">Institution Settings</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Institution Settings</h1>
          <p className="page-subtitle">
            Manage your school's branding, report card settings, and signatures
          </p>
        </div>
      </div>

      <InstitutionSettings organization={organization} userId={authUser.id} />
    </div>
  )
}
