// FILE: src/app/(dashboard)/departments/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { createDepartment } from '../actions'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const schema = z.object({
  name: z.string().min(2, 'Department name is required'),
  code: z.string().optional(),
  faculty_id: z.string().min(1, 'Select a faculty'),
})
type FormData = z.infer<typeof schema>

export default function NewDepartmentPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [faculties, setFaculties] = useState<{ id: string; name: string }[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
      const { data } = await supabase.from('faculties').select('id, name').eq('organization_id', profile?.organization_id).order('name')
      setFaculties(data ?? [])
    }
    load()
  }, [])

  async function onValidSubmit(data: FormData) {
    setIsSubmitting(true)
    const fd = new FormData()
    fd.set('name', data.name)
    if (data.code) fd.set('code', data.code)
    fd.set('faculty_id', data.faculty_id)
    await createDepartment(fd)
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/departments" className="text-sm text-ink-muted hover:text-ink">Departments</Link>
        <span className="text-ink-faint">/</span>
        <span className="text-sm text-ink font-medium">New Department</span>
      </div>
      <h1 className="page-title mb-6">Add a Department</h1>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"><p className="text-sm text-red-700">{decodeURIComponent(error)}</p></div>}

      {faculties.length === 0 ? (
        <p className="text-sm text-ink-faint">You need to <Link href="/faculties/new" className="text-brand-500 hover:underline">add a faculty</Link> first.</p>
      ) : (
        <form onSubmit={handleSubmit(onValidSubmit)} className="card p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Faculty <span className="text-red-500">*</span></label>
            <select className="input" {...register('faculty_id')}>
              <option value="">Select faculty</option>
              {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            {errors.faculty_id && <p className="text-xs text-red-500 mt-1">{errors.faculty_id.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Department name <span className="text-red-500">*</span></label>
            <input type="text" placeholder="e.g. Department of Agricultural Economics" className="input" {...register('name')} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Code (optional)</label>
            <input type="text" placeholder="e.g. AGE" className="input" {...register('code')} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary btn flex-1" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create department'}</button>
            <Link href="/departments" className="btn-secondary btn">Cancel</Link>
          </div>
        </form>
      )}
    </div>
  )
}