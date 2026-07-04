'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

interface Props {
  classes: { id: string; name: string }[]
  subjects: { id: string; name: string; group_id: string }[]
}

export default function TeacherForm({ classes, subjects }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('subject_teacher')
  const [assignments, setAssignments] = useState<{ classId: string; subjectId: string }[]>([
    { classId: '', subjectId: '' }
  ])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('users').select('organization_id').eq('id', user!.id).single()

    // Create teacher user
    const { data: teacher, error: userError } = await supabase
      .from('users')
      .insert({
        name: name.trim(),
        email: email.trim(),
        role: role,
        organization_id: profile?.organization_id,
        is_active: true
      })
      .select('id')
      .single()

    if (userError) {
      toast.error('Failed to create teacher: ' + userError.message)
      setLoading(false)
      return
    }

    // Create assignments
    for (const assign of assignments) {
      if (assign.classId || assign.subjectId) {
        await supabase
          .from('teacher_assignments')
          .insert({
            organization_id: profile?.organization_id,
            teacher_id: teacher.id,
            class_id: assign.classId || null,
            subject_id: assign.subjectId || null,
            role: role,
            is_active: true
          })
      }
    }

    toast.success('Teacher created successfully!')
    router.push('/settings/teachers')
    router.refresh()
    setLoading(false)
  }

  function addAssignment() {
    setAssignments(prev => [...prev, { classId: '', subjectId: '' }])
  }

  function removeAssignment(index: number) {
    setAssignments(prev => prev.filter((_, i) => i !== index))
  }

  function updateAssignment(index: number, field: 'classId' | 'subjectId', value: string) {
    setAssignments(prev => prev.map((a, i) => 
      i === index ? { ...a, [field]: value } : a
    ))
  }

  // Get subjects for a specific class
  const getClassSubjects = (classId: string) => {
    return subjects.filter(s => s.group_id === classId)
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-ink mb-1">
            Full Name *
          </label>
          <input
            type="text"
            className="input"
            placeholder="e.g. John Doe"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink mb-1">
            Email *
          </label>
          <input
            type="email"
            className="input"
            placeholder="e.g. john@school.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink mb-1">
          Role *
        </label>
        <select
          className="input max-w-xs"
          value={role}
          onChange={e => setRole(e.target.value)}
          required
        >
          <option value="subject_teacher">Subject Teacher</option>
          <option value="class_teacher">Class Teacher</option>
          <option value="assistant">Assistant</option>
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-xs font-medium text-ink">
            Assignments
          </label>
          <button
            type="button"
            onClick={addAssignment}
            className="btn-secondary btn-sm btn"
          >
            <Plus size={13} /> Add Assignment
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {assignments.map((assign, index) => (
            <div key={index} className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-ink mb-1">
                  Class
                </label>
                <select
                  className="input"
                  value={assign.classId}
                  onChange={e => {
                    updateAssignment(index, 'classId', e.target.value)
                    // Clear subject if class changes
                    if (assign.subjectId) {
                      const classSubjects = getClassSubjects(e.target.value)
                      if (!classSubjects.find(s => s.id === assign.subjectId)) {
                        updateAssignment(index, 'subjectId', '')
                      }
                    }
                  }}
                >
                  <option value="">No class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-ink mb-1">
                  Subject
                </label>
                <select
                  className="input"
                  value={assign.subjectId}
                  onChange={e => updateAssignment(index, 'subjectId', e.target.value)}
                  disabled={!assign.classId}
                >
                  <option value="">No subject</option>
                  {assign.classId ? (
                    getClassSubjects(assign.classId).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))
                  ) : (
                    subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.group_id ? `(${classes.find(c => c.id === s.group_id)?.name || ''})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <button
                type="button"
                onClick={() => removeAssignment(index)}
                disabled={assignments.length === 1}
                className="p-2 text-ink-faint hover:text-red-500 transition-colors disabled:opacity-30"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-ink-muted mt-2">
          Each teacher can be assigned to multiple classes and subjects.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary btn"
        >
          {loading ? 'Creating...' : 'Create Teacher'}
        </button>
        <Link href="/settings/teachers" className="btn-secondary btn">
          Cancel
        </Link>
      </div>
    </form>
  )
}
