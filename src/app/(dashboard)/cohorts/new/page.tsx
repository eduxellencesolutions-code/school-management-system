// FILE: src/app/(dashboard)/cohorts/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { createCohort } from '../actions'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const schema = z.object({
  name: z.string().min(2, 'Cohort name is required'),
  code: z.string().optional(),
  programme_id: z.string().min(1, 'Select a programme'),
  level: z.string().optional(),
  session_id: z.string().optional(),
  term_id: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function NewCohortPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const preselectedProgramme = searchParams.get('programme_id') || ''

  const [programmes, setProgrammes] = useState<{ id: string; name: string; department_id: string }[]>([])
  const [sessions, setSessions] = useState<{ id: string; name: string }[]>([])
  const [terms, setTerms] = useState<{ id: string; name: string; session_id: string }[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { programme_id: preselectedProgramme },
  })
  const selectedSessionId = watch('session_id')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
      const orgId = profile?.organization_id

      const { data: prog } = await supabase.from('programmes').select('id, name, department_id').eq('organization_id', orgId).order('name')
      setProgrammes(prog ?? [])

      const { data: sess } = await supabase.from('academic_sessions').select('id, name').eq('organization_id', orgId).order('name', { ascending: false })
      setSessions(sess ?? [])

      const sessionIds = (sess ?? []).map(s => s.id)
      if (sessionIds.length > 0) {
        const { data: t } = await supabase.from('terms').select('id, name, session_id').in('session_id', sessionIds).order('name')
        setTerms(t ?? [])
      }
    }
    load()
  }, [])

  const availableTerms = terms.filter(t => t.session_id === selectedSessionId)

  async function onValidSubmit(data: FormData) {
    setIsSubmitting(true)
    const fd = new FormData()
    fd.set('name', data.name)
    if (data.code) fd.set('code', data.code)
    fd.set('programme_id', data.programme_id)
    const prog = programmes.find(p => p.id === data.programme_id)
    if (prog) fd.set('department_id', prog.department_id)
    if (data.level) fd.set('level', data.level)
    if (data.session_id) fd.set('session_id', data.session_id)
    if (data.term_id) fd.set('term_id', data.term_id)
    await createCohort(fd)
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/cohorts" className="text-sm text-ink-muted hover:text-ink">Cohorts</Link>
        <span className="text-ink-faint">/</span>
        <span className="text-sm text-ink font-medium">New Cohort</span>
      </div>
      <h1 className="page-title mb-1">Add a Cohort</h1>
      <p className="page-subtitle mb-6">e.g. "300L Agric Econ — 2026/27 First Semester"</p>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"><p className="text-sm text-red-700">{decodeURIComponent(error)}</p></div>}

      {programmes.length === 0 ? (
        <p className="text-sm text-ink-faint">You need to <Link href="/programmes/new" className="text-brand-500 hover:underline">add a programme</Link> first.</p>
      ) : (
        <form onSubmit={handleSubmit(onValidSubmit)} className="card p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Programme <span className="text-red-500">*</span></label>
            <select className="input" {...register('programme_id')}>
              <option value="">Select programme</option>
              {programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {errors.programme_id && <p className="text-xs text-red-500 mt-1">{errors.programme_id.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Cohort name <span className="text-red-500">*</span></label>
            <input type="text" placeholder="e.g. 300L Agric Econ - First Semester" className="input" {...register('name')} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Level</label>
              <input type="text" placeholder="e.g. 300, HND1, ND2" className="input" {...register('level')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Code (optional)</label>
              <input type="text" className="input" {...register('code')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Session</label>
              <select className="input" {...register('session_id')}>
                <option value="">Select session</option>
                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Term / Semester</label>
              <select className="input" {...register('term_id')} disabled={!selectedSessionId}>
                <option value="">{selectedSessionId ? 'Select term' : 'Select session first'}</option>
                {availableTerms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary btn flex-1" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create cohort'}</button>
            <Link href="/cohorts" className="btn-secondary btn">Cancel</Link>
          </div>
        </form>
      )}
    </div>
  )
}