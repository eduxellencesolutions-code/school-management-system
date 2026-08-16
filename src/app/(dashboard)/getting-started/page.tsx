import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { School, GraduationCap, ArrowRight } from 'lucide-react'

export default async function GettingStartedPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users').select('*').eq('id', authUser.id).single()

  const orgId = user?.organization_id
  const isSoloTeacher = !orgId && user?.role === 'teacher'
  const isInstitutionAdmin = !!orgId && user?.role === 'admin'

  // Anyone who lands here who isn't one of the two account-creator types
  // (e.g. an invited staff member somehow hitting this route directly)
  // has no welcome variant to show — send them straight to the dashboard.
  if (!isSoloTeacher && !isInstitutionAdmin) {
    redirect('/dashboard')
  }

  // Already seen it, or already fully set up — never show this again.
  const { data: state } = await supabase
    .from('onboarding_state')
    .select('welcome_seen_at')
    .eq('user_id', authUser.id)
    .maybeSingle()

  if (state?.welcome_seen_at) {
    redirect('/dashboard')
  }

  const { data: progress } = await supabase.rpc('get_onboarding_dashboard')
  if (progress?.percent === 100) {
    redirect('/dashboard')
  }

  // Mark as seen now, server-side, before rendering — so navigating away
  // without clicking anything still counts as "shown," matching "don't
  // repeatedly show this to returning users."
  await supabase
    .from('onboarding_state')
    .upsert(
      { user_id: authUser.id, organization_id: orgId ?? null, welcome_seen_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

  const schoolName = orgId
    ? (await supabase.from('organizations').select('name').eq('id', orgId).single()).data?.name
    : null

  return (
    <div className="max-w-lg mx-auto mt-12 px-4">
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
          {isSoloTeacher ? (
            <GraduationCap size={28} className="text-purple-600" />
          ) : (
            <School size={28} className="text-blue-600" />
          )}
        </div>

        {isSoloTeacher ? (
          <>
            <h1 className="text-xl font-semibold text-gray-900">Welcome to Eduxellence Results 🎉</h1>
            <p className="text-sm text-gray-600 mt-3 leading-relaxed">
              Your Solo Teacher account is ready. You can now configure your teaching
              workspace — set up your profile, create your first class, add students,
              and start entering results.
            </p>
            <Link
              href="/setup-guide"
              className="inline-flex items-center gap-2 mt-6 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg"
            >
              Set Up My Teaching Account <ArrowRight size={16} />
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-gray-900">Welcome to Eduxellence Results 🎉</h1>
            <p className="text-sm text-gray-600 mt-3 leading-relaxed">
              {schoolName ? `"${schoolName}"` : 'Your school'} has been created. The next
              step is completing your school setup — your profile, academic structure,
              staff, and grading system.
            </p>
            <Link
              href="/setup-guide"
              className="inline-flex items-center gap-2 mt-6 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg"
            >
              Set Up My School <ArrowRight size={16} />
            </Link>
          </>
        )}

        <div className="mt-4">
          <Link href="/dashboard" className="text-xs text-gray-400 hover:text-gray-600">
            Go to Dashboard instead
          </Link>
        </div>
      </div>
    </div>
  )
}