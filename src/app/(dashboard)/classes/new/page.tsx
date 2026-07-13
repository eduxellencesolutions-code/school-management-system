'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const schema = z.object({
  name: z.string().min(2, 'Class name is required'),
  code: z.string().optional(),
  type: z.enum(['class', 'course', 'department']),
  session_id: z.string().optional(),
  term_id: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface SessionOption { id: string; name: string }
interface TermOption { id: string; name: string; session_id: string }

export default function NewClassPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState<SessionOption[]>([])
  const [terms, setTerms] = useState<TermOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'class' },
  })

  const selectedSessionId = watch('session_id')

  useEffect(() => {
    async function loadOptions() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('users').select('organization_id').eq('id', user.id).single()

      const { data: sessionsData } = profile?.organization_id
        ? await supabase.from('academic_sessions').select('id, name').eq('organization_id', profile.organization_id).order('name', { ascending: false })
        : await supabase.from('academic_sessions').select('id, name').eq('instructor_id', user.id).order('name', { ascending: false })

      setSessions(sessionsData ?? [])

      const sessionIds = (sessionsData ?? []).map(s => s.id)
      if (sessionIds.length > 0) {
        const { data: termsData } = await supabase
          .from('terms').select('id, name, session_id').in('session_id', sessionIds).order('name')
        setTerms(termsData ?? [])
      }

      setLoadingOptions(false)
    }
    loadOptions()
  }, [])

  const availableTerms = terms.filter(t => t.session_id === selectedSessionId)

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('users').select('organization_id, role').eq('id', user.id).single()

      const { data: group, error } = await supabase
        .from('groups')
        .insert({
          organization_id: profile?.organization_id,
          name: data.name,
          code: data.code || null,
          type: data.type,
          instructor_id: user.id,
          session_id: data.session_id || null,
          term_id: data.term_id || null,
          is_active: true,
        })
        .select().single()

      if (error) throw error

      toast.success(`Class "${data.name}" created!`)
      router.refresh()
      router.push(`/classes/${group.id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create class')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/classes" className="text-sm text-ink-muted hover:text-ink">Classes</Link>
        <span className="text-ink-faint">/</span>
        <span className="text-sm text-ink font-medium">New Class</span>
      </div>

      <h1 className="page-title mb-1">Create a new class</h1>
      <p className="page-subtitle mb-6">Set up a class or course to start entering scores.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Class name <span className="text-red-500">*</span></label>
          <input type="text" placeholder="e.g. JSS 2A, Primary 4 Gold, BIO 101" className="input" {...register('name')} />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1">Class code (optional)</label>
          <input type="text" placeholder="e.g. JSS2A" className="input" {...register('code')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1">Type</label>
          <select className="input" {...register('type')}>
            <option value="class">Class (School)</option>
            <option value="course">Course (University / Polytechnic)</option>
            <option value="department">Department</option>
          </select>
        </div>

        <div className="border-t border-surface-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Academic period (optional)</p>
            <Link href="/settings/academic" className="text-xs text-brand-500 hover:underline">Manage sessions & terms</Link>
          </div>

          {loadingOptions ? (
            <p className="text-xs text-ink-faint">Loading…</p>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-ink-faint">
              No sessions set up yet.{' '}
              <Link href="/settings/academic" className="text-brand-500 hover:underline">Add one first</Link>{' '}
              or skip this for now.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Session / Year</label>
                <select className="input" {...register('session_id')}>
                  <option value="">Select session</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Term / Semester</label>
                <select className="input" {...register('term_id')} disabled={!selectedSessionId}>
                  <option value="">
                    {selectedSessionId ? 'Select term' : 'Select session first'}
                  </option>
                  {availableTerms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary btn flex-1">
            {loading ? 'Creating…' : 'Create class'}
          </button>
          <Link href="/classes" className="btn-secondary btn">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
