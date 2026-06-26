import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TemplateManager from '@/components/dashboard/TemplateManager'
import GradingManager from '@/components/dashboard/GradingManager'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single()

  // Only admins access this page
  if (profile?.role !== 'admin') redirect('/dashboard')

  const orgId = profile.organization_id

  const [
    { data: templates },
    { data: gradingSystem },
  ] = await Promise.all([
    supabase
      .from('assessment_templates')
      .select('id, name, description, is_default, components:assessment_components(id, name, max_score, sequence, weight)')
      .eq('organization_id', orgId)
      .order('name'),
    supabase
      .from('grading_systems')
      .select('id, grade_letter, min_score, max_score, remark, points')
      .eq('organization_id', orgId)
      .order('min_score', { ascending: false }),
  ])

  return (
    <div className="max-w-4xl flex flex-col gap-8">
      <div>
        <h1 className="page-title">Administration</h1>
        <p className="page-subtitle">Manage assessment templates and grading systems for your institution</p>
      </div>

      <TemplateManager
        orgId={orgId}
        templates={templates ?? []}
      />

      <GradingManager
        orgId={orgId}
        gradingSystem={gradingSystem ?? []}
      />
    </div>
  )
}
