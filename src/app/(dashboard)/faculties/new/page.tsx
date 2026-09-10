// FILE: src/app/(dashboard)/faculties/new/page.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createFaculty } from '../actions'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

const schema = z.object({
  name: z.string().min(2, 'Faculty name is required'),
  code: z.string().optional(),
  description: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function NewFacultyPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onValidSubmit(data: FormData) {
    setIsSubmitting(true)
    const fd = new FormData()
    fd.set('name', data.name)
    if (data.code) fd.set('code', data.code)
    if (data.description) fd.set('description', data.description)
    await createFaculty(fd)
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/faculties" className="text-sm text-ink-muted hover:text-ink">Faculties</Link>
        <span className="text-ink-faint">/</span>
        <span className="text-sm text-ink font-medium">New Faculty</span>
      </div>
      <h1 className="page-title mb-6">Add a Faculty</h1>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"><p className="text-sm text-red-700">{decodeURIComponent(error)}</p></div>}

      <form onSubmit={handleSubmit(onValidSubmit)} className="card p-6 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Faculty name <span className="text-red-500">*</span></label>
          <input type="text" placeholder="e.g. Faculty of Agriculture" className="input" {...register('name')} />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Code (optional)</label>
          <input type="text" placeholder="e.g. AGR" className="input" {...register('code')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Description (optional)</label>
          <textarea className="input" rows={2} {...register('description')} />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary btn flex-1" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create faculty'}</button>
          <Link href="/faculties" className="btn-secondary btn">Cancel</Link>
        </div>
      </form>
    </div>
  )
}