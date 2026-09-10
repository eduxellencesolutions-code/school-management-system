// FILE: src/app/(dashboard)/programmes/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { createProgramme } from '../actions'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const schema = z.object({
  name: z.string().min(2, 'Programme name is required'),
  code: z.string().optional(),
  department_id: z.string().min(1, 'Select a department'),
  degree_type: z.string().optional(),
  duration_years: z.string().optional(),
  min_credit_units: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function NewProgrammePage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
      const { data } = await supabase.from('departments').select('id, name').eq('organization_id', profile?.organization_id).order('name')
      setDepartments(data ?? [])
    }
    load()
  }, [])

  async function onValidSubmit(data: FormData) {
    setIsSubmitting(true)
    const fd = new FormData()
    fd.set('name', data.name)
    if (data.code) fd.set('code', data.code)
    fd.set('department_id', data.department_id)
    if (data.degree_type) fd.set('degree_type', data.degree_type)
    if (data.duration_years) fd.set('duration_years', data.duration_years)
    if (data.min_credit_units) fd.set('min_credit_units', data.min_credit_units)
    await createProgramme(fd)
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/programmes" className="text-sm text-ink-muted hover:text-ink">Programmes</Link>
        <span className="text-ink-faint">/</span>
        <span className="text-sm text-ink font-medium">New Programme</span>
      </div>
      <h1 className="page-title mb-6">Add a Programme</h1>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"><p className="text-sm text-red-700">{decodeURIComponent(error)}</p></div>}

      {departments.length === 0 ? (
        <p className="text-sm text-ink-faint">You need to <Link href="/departments/new" className="text-brand-500 hover:underline">add a department</Link> first.</p>
      ) : (
        <form onSubmit={handleSubmit(onValidSubmit)} className="card p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Department <span className="text-red-500">*</span></label>
            <select className="input" {...register('department_id')}>
              <option value="">Select department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            {errors.department_id && <p className="text-xs text-red-500 mt-1">{errors.department_id.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Programme name <span className="text-red-500">*</span></label>
            <input type="text" placeholder="e.g. B.Sc. Agricultural Economics" className="input" {...register('name')} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Code</label>
              <input type="text" placeholder="e.g. AGE" className="input" {...register('code')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Degree type</label>
              <input type="text" placeholder="e.g. B.Sc., HND, ND" className="input" {...register('degree_type')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Duration (years)</label>
              <input type="number" placeholder="e.g. 4" className="input" {...register('duration_years')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Min. credit units to graduate</label>
              <input type="number" placeholder="e.g. 120" className="input" {...register('min_credit_units')} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary btn flex-1" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create programme'}</button>
            <Link href="/programmes" className="btn-secondary btn">Cancel</Link>
          </div>
        </form>
      )}
    </div>
  )
}