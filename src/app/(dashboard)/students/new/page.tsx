'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { createStudent } from '../actions'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

const schema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  other_names: z.string().optional(),
  admission_number: z.string().optional(),
  gender: z.enum(['M', 'F', 'Other']).optional(),
  date_of_birth: z.string().optional(),
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  group_id: z.string().min(1, 'Please select a class'),
})
type FormData = z.infer<typeof schema>

interface Group { id: string; name: string }

export default function NewStudentPage() {
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [groups, setGroups] = useState<Group[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Get error and success from URL
  const error = searchParams.get('error')
  const success = searchParams.get('success')

  const { register, handleSubmit, formState: { errors }, getValues } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { group_id: searchParams.get('class') ?? '' },
  })

  useState(() => {
    async function load() {
      const { user } = await getAuthenticatedUser(supabase)
      if (!user) return
      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      let query = supabase
        .from('groups')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      
      query = profile?.organization_id
        ? query.eq('organization_id', profile.organization_id)
        : query.eq('instructor_id', user.id)

      const { data: grps } = await query
      setGroups(grps ?? [])
    }
    load()
  })

  // ✅ FIX: Call server action directly instead of using native form action
  async function onValidSubmit(data: FormData) {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const fd = new FormData()
      fd.set('first_name', data.first_name)
      fd.set('last_name', data.last_name)
      if (data.other_names) fd.set('other_names', data.other_names)
      if (data.admission_number) fd.set('admission_number', data.admission_number)
      if (data.gender) fd.set('gender', data.gender)
      if (data.date_of_birth) fd.set('date_of_birth', data.date_of_birth)
      if (data.guardian_name) fd.set('guardian_name', data.guardian_name)
      if (data.guardian_phone) fd.set('guardian_phone', data.guardian_phone)
      if (data.email) fd.set('email', data.email)
      fd.set('group_id', data.group_id)
      
      // ✅ Call server action directly — redirects will work via Next.js
      await createStudent(fd)
    } catch (error) {
      // ✅ Server actions throw redirect errors — that's expected
      // Any other error should be logged
      if (!(error instanceof Error && error.message?.includes('NEXT_REDIRECT'))) {
        console.error('Error creating student:', error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/students" className="text-ink-muted hover:text-ink">Students</Link>
        <span className="text-ink-faint">/</span>
        <span className="text-ink font-medium">Add student</span>
      </div>

      <h1 className="page-title mb-1">Add a student</h1>
      <p className="page-subtitle mb-6">
        Adding many students?{' '}
        <Link href="/students/import" className="text-brand-500 hover:underline font-medium">Import via CSV</Link>
        {' '}instead.
      </p>

      {/* ✅ Display error message from URL */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-700">{decodeURIComponent(error)}</p>
        </div>
      )}
      
      {/* ✅ Display success message if needed */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-green-700">{decodeURIComponent(success)}</p>
        </div>
      )}

      {/* ✅ REMOVED action={createStudent} — server action called programmatically via RHF's handleSubmit */}
      <form
        onSubmit={handleSubmit(onValidSubmit)}
        className="flex flex-col gap-6"
      >
        <div className="card p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-ink">Class assignment</h2>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Class <span className="text-red-500">*</span></label>
            <select className="input" {...register('group_id')}>
              <option value="">Select class…</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            {errors.group_id && <p className="text-xs text-red-500 mt-1">{errors.group_id.message}</p>}
          </div>
        </div>

        <div className="card p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-ink">Personal information</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Last name <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Okafor" className="input" {...register('last_name')} />
              {errors.last_name && <p className="text-xs text-red-500 mt-1">{errors.last_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">First name <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Amara" className="input" {...register('first_name')} />
              {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Other names</label>
            <input type="text" placeholder="Middle name(s)" className="input" {...register('other_names')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Admission number</label>
              <input type="text" placeholder="SS1/2026/001" className="input font-mono" {...register('admission_number')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Gender</label>
              <select className="input" {...register('gender')}>
                <option value="">Not specified</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Date of birth</label>
            <input type="date" className="input" {...register('date_of_birth')} />
          </div>
        </div>

        <div className="card p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-ink">Guardian / Parent contact</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Guardian name</label>
              <input type="text" placeholder="Mr Okafor James" className="input" {...register('guardian_name')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Guardian phone</label>
              <input type="tel" placeholder="08012345678" className="input" {...register('guardian_phone')} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Student email (optional)</label>
            <input type="email" placeholder="student@example.com" className="input" {...register('email')} />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" className="btn-primary btn flex-1" disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add student'}
          </button>
          <Link href="/students" className="btn-secondary btn">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
