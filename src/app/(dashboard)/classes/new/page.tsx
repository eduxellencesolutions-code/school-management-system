'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const schema = z.object({
  name:       z.string().min(2, 'Class name is required'),
  code:       z.string().optional(),
  type:       z.enum(['class', 'course', 'department']),
  session_name: z.string().optional(),
  term_name:    z.string().optional(),
})
type FormData = z.infer<typeof schema>

const TERM_PRESETS = ['First Term', 'Second Term', 'Third Term', 'First Semester', 'Second Semester']

export default function NewClassPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'class' },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('users').select('organization_id, role').eq('id', user.id).single()

      // Create or reuse session
      let sessionId: string | null = null
      if (data.session_name && profile?.organization_id) {
        const { data: existingSession } = await supabase
          .from('academic_sessions')
          .select('id')
          .eq('organization_id', profile.organization_id)
          .eq('name', data.session_name)
          .single()

        if (existingSession) {
          sessionId = existingSession.id
        } else {
          const { data: newSession } = await supabase
            .from('academic_sessions')
            .insert({ organization_id: profile.organization_id, name: data.session_name, is_active: true })
            .select().single()
          sessionId = newSession?.id ?? null
        }
      }

      // Create or reuse term
      let termId: string | null = null
      if (data.term_name && sessionId && profile?.organization_id) {
        const { data: newTerm } = await supabase
          .from('terms')
          .insert({
            session_id: sessionId,
            organization_id: profile.organization_id,
            name: data.term_name,
            is_active: true,
          })
          .select().single()
        termId = newTerm?.id ?? null
      }

      // Create the group
      const { data: group, error } = await supabase
        .from('groups')
        .insert({
          organization_id: profile?.organization_id,
          name: data.name,
          code: data.code || null,
          type: data.type,
          instructor_id: user.id,
          session_id: sessionId,
          term_id: termId,
          is_active: true,
        })
        .select().single()

      if (error) throw error

      toast.success(`Class "${data.name}" created!`)
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
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Academic period (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Session / Year</label>
              <input type="text" placeholder="2026/2027" className="input" {...register('session_name')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Term / Semester</label>
              <select className="input" {...register('term_name')}>
                <option value="">Select term</option>
                {TERM_PRESETS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
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
