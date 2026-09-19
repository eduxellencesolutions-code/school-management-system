// FILE: src/app/(dashboard)/courses/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { createCourse } from '../actions'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const schema = z.object({
  group_id: z.string().min(1, 'Select a cohort'),
  name: z.string().min(2, 'Course name is required'),
  code: z.string().optional(),
  credit_unit: z.string().min(1, 'Credit unit is required'),
  course_type: z.enum(['core', 'elective', 'compulsory']),
  instructor_id: z.string().optional(),
  prerequisite_subject_id: z.string().optional(),
  description: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function NewCoursePage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const preselectedGroup = searchParams.get('group_id') || ''

  const [cohorts, setCohorts] = useState<{ id: string; name: string }[]>([])
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([])
  const [existingCourses, setExistingCourses] = useState<{ id: string; name: string; code: string | null }[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { group_id: preselectedGroup, course_type: 'core' },
  })
  const selectedGroupId = watch('group_id')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
      const { data: groups } = await supabase.from('groups').select('id, name').eq('organization_id', profile?.organization_id).eq('type', 'cohort').order('name')
      setCohorts(groups ?? [])
      const { data: users } = await supabase
        .from('users')
        .select('id, name')
        .eq('organization_id', profile?.organization_id)
        .order('name')
      setStaff(users ?? [])
    }
    load()
  }, [])

  useEffect(() => {
    async function loadCourses() {
      if (!selectedGroupId) { setExistingCourses([]); return }
      const { data } = await supabase.from('subjects').select('id, name, code').eq('group_id', selectedGroupId).order('code')
      setExistingCourses(data ?? [])
    }
    loadCourses()
  }, [selectedGroupId])

  async function onValidSubmit(data: FormData) {
    setIsSubmitting(true)
    const fd = new FormData()
    fd.set('group_id', data.group_id)
    fd.set('name', data.name)
    if (data.code) fd.set('code', data.code)
    fd.set('credit_unit', data.credit_unit)
    fd.set('course_type', data.course_type)
    if (data.instructor_id) fd.set('instructor_id', data.instructor_id)
    if (data.prerequisite_subject_id) fd.set('prerequisite_subject_id', data.prerequisite_subject_id)
    if (data.description) fd.set('description', data.description)
    await createCourse(fd)
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/courses" className="text-sm text-ink-muted hover:text-ink">Courses</Link>
        <span className="text-ink-faint">/</span>
        <span className="text-sm text-ink font-medium">New Course</span>
      </div>
      <h1 className="page-title mb-6">Add a Course</h1>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"><p className="text-sm text-red-700">{decodeURIComponent(error)}</p></div>}

      {cohorts.length === 0 ? (
        <p className="text-sm text-ink-faint">You need to <Link href="/cohorts/new" className="text-brand-500 hover:underline">add a cohort</Link> first.</p>
      ) : (
        <form onSubmit={handleSubmit(onValidSubmit)} className="card p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Cohort <span className="text-red-500">*</span></label>
            <select className="input" {...register('group_id')}>
              <option value="">Select cohort</option>
              {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.group_id && <p className="text-xs text-red-500 mt-1">{errors.group_id.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Course code</label>
              <input type="text" placeholder="e.g. AGE 301" className="input" {...register('code')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Credit unit <span className="text-red-500">*</span></label>
              <input type="number" step="1" placeholder="e.g. 3" className="input" {...register('credit_unit')} />
              {errors.credit_unit && <p className="text-xs text-red-500 mt-1">{errors.credit_unit.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Course title <span className="text-red-500">*</span></label>
            <input type="text" placeholder="e.g. Agricultural Production Economics" className="input" {...register('name')} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Course type</label>
            <select className="input" {...register('course_type')}>
              <option value="core">Core</option>
              <option value="compulsory">Compulsory</option>
              <option value="elective">Elective</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Instructor</label>
            <select className="input" {...register('instructor_id')}>
              <option value="">Unassigned</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Prerequisite (optional)</label>
            <select className="input" {...register('prerequisite_subject_id')}>
              <option value="">None</option>
              {existingCourses.map(c => <option key={c.id} value={c.id}>{c.code ? `${c.code} — ` : ''}{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Description (optional)</label>
            <textarea className="input" rows={2} {...register('description')} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary btn flex-1" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create course'}</button>
            <Link href="/courses" className="btn-secondary btn">Cancel</Link>
          </div>
        </form>
      )}
    </div>
  )
}