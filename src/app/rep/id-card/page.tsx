import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import IdCardGenerator from '@/components/representatives/IdCardGenerator'

export default async function IdCardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rep } = await supabase.from('representatives').select('id').eq('user_id', user.id).maybeSingle()
  if (!rep) redirect('/dashboard')

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">?? My ID Card</h1>
      <IdCardGenerator />
    </div>
  )
}
