'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  first_name:       z.string().min(1, 'First name is required'),
  last_name:        z.string().min(1, 'Last name is required'),
  other_names:      z.string().optional(),
  admission_number: z.string().optional(),
  gender:           z.enum(['M', 'F', 'Other']).optional(),
  date_of_birth:    z.string().optional(),
  guardian_name:    z.string().optional(),
  guardian_phone:   z.string().optional(),
  email:            z.string().email().optional().or(z.literal('')),
  phone:            z.string().optional(),
  group_id:         z.string().min(1, 'Please select a class'),
})
type FormData = z.infer<typeof schema>

interface Group { id: string; name: string }

export default function NewStudentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [groupsLoaded, setGroupsLoaded] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { group_id: searchParams.get('class') ?? '' },
  })

  // Load groups on mount
  useState(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
      const { data: grps } = await supabase
        .from('groups').select('id, name')
        .eq('organization_id', profile?.organization_id ?? '')
        .eq('is_active', true).order('name')
      setGroups(grps ?? [])
      setGroupsLoaded(true)
    }
    load()
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).single()

      const { error } = await supabase.from('learners').insert({
        organization_id:  profile?.organization_id,
        group_id:         data.group_id,
        first_name:       data.first_name,
        last_name:        data.last_name,
        other_names:      data.other_names || null,
        admission_number: data.admission_number || null,
        gender:           data.gender || null,
        date_of_birth:    data.date_of_birth || null,
        guardian_name:    data.guardian_name || null,
        guardian_phone:   data.guardian_phone || null,
        email:            data.email || null,
        phone:            data.phone || null,
        enrollment_date:  new Date().toISOString().split('T')[0],
        is_active:        true,
      })

      if (error) {
        if (error.code === '23505') throw new Error('Admission number already exists')
        throw error
      }

      toast.success(`${data.first_name} ${data.last_name} enrolled!`)
      router.push(`/students?class=${data.group_id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add student')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl">
      {/* Breadcrumb */}
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

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {/* Class assignment */}
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

        {/* Personal info */}
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

        {/* Guardian info */}
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
          <button type="submit" disabled={loading} className="btn-primary btn flex-1">
            {loading ? 'Saving…' : 'Add student'}
          </button>
          <Link href="/students" className="btn-secondary btn">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
