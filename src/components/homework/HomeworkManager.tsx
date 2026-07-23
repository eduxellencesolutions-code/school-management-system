'use client'

import { useState, useEffect } from 'react'
import { Loader2, Plus, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ClassOption { id: string; name: string }
interface Subject { id: string; name: string }
interface Assignment {
  id: string
  subject_id: string
  title: string
  issued_date: string
  due_date: string
}
interface Learner { id: string; first_name: string; last_name: string }

type SubStatus = 'submitted' | 'late' | 'not_submitted'

export default function HomeworkManager({ classes }: { classes: ClassOption[] }) {
  const supabase = createClient()
  const [groupId, setGroupId] = useState(classes[0]?.id ?? '')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null)
  const [learners, setLearners] = useState<Learner[]>([])
  const [statuses, setStatuses] = useState<Record<string, SubStatus>>({})

  const [showForm, setShowForm] = useState(false)
  const [newSubjectId, setNewSubjectId] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newIssued, setNewIssued] = useState(new Date().toISOString().split('T')[0])
  const [newDue, setNewDue] = useState('')

  const [loadingAssignments, setLoadingAssignments] = useState(false)
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!groupId) return
    supabase.from('subjects').select('id, name').eq('group_id', groupId).eq('is_active', true).order('name')
      .then(({ data }) => setSubjects(data ?? []))
    loadAssignments()
  }, [groupId])

  async function loadAssignments() {
    setLoadingAssignments(true)
    setError(null)
    const res = await fetch(`/api/homework?groupId=${groupId}`)
    const data = await res.json()
    if (data.error) {
      setError(data.error)
      setAssignments([])
    } else {
      setAssignments(data.assignments ?? [])
    }
    setLoadingAssignments(false)
  }

  async function createAssignment() {
    if (!newSubjectId || !newTitle || !newDue) return
    setSaving(true)
    setError(null)

    const res = await fetch('/api/homework', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId,
        subjectId: newSubjectId,
        title: newTitle,
        issuedDate: newIssued,
        dueDate: newDue,
      }),
    })

    const data = await res.json()
    if (data.success) {
      setShowForm(false)
      setNewTitle('')
      setNewDue('')
      loadAssignments()
    } else {
      setError(data.error ?? 'Failed to create assignment.')
    }
    setSaving(false)
  }

  async function openSubmissions(assignment: Assignment) {
    setSelectedAssignmentId(assignment.id)
    setLoadingSubmissions(true)
    setError(null)

    const { data: learnerData } = await supabase
      .from('learners')
      .select('id, first_name, last_name')
      .eq('group_id', groupId)
      .eq('is_active', true)
      .order('last_name')

    setLearners(learnerData ?? [])

    const res = await fetch(`/api/homework/submissions?assignmentId=${assignment.id}`)
    const data = await res.json()

    const initial: Record<string, SubStatus> = {}
    ;(learnerData ?? []).forEach((l) => { initial[l.id] = 'not_submitted' })
    ;(data.submissions ?? []).forEach((s: { learner_id: string; status: SubStatus }) => {
      initial[s.learner_id] = s.status
    })
    setStatuses(initial)
    setLoadingSubmissions(false)
  }

  async function setStatus(learnerId: string, status: SubStatus) {
    if (!selectedAssignmentId) return
    setStatuses((prev) => ({ ...prev, [learnerId]: status }))

    const res = await fetch('/api/homework/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId: selectedAssignmentId, learnerId, status }),
    })
    const data = await res.json()
    if (data.error) setError(data.error)
  }

  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId)

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-5 flex items-center gap-4 flex-wrap">
        <select
          value={groupId}
          onChange={(e) => { setGroupId(e.target.value); setSelectedAssignmentId(null) }}
          className="border border-surface-200 rounded px-2 py-1.5 text-sm"
        >
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary btn-sm btn flex items-center gap-1.5 ml-auto">
          <Plus size={14} /> New Assignment
        </button>
      </div>

      {error && <div className="card p-4 text-sm text-red-600 bg-red-50 border-red-100">{error}</div>}

      {showForm && (
        <div className="card p-5 flex flex-col gap-3">
          <select
            value={newSubjectId}
            onChange={(e) => setNewSubjectId(e.target.value)}
            className="border border-surface-200 rounded px-3 py-2 text-sm"
          >
            <option value="">Select subject...</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input
            type="text"
            placeholder="Assignment title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="border border-surface-200 rounded px-3 py-2 text-sm"
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-ink-muted">Issued date</label>
              <input type="date" value={newIssued} onChange={(e) => setNewIssued(e.target.value)}
                className="w-full border border-surface-200 rounded px-3 py-2 text-sm" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-ink-muted">Due date</label>
              <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)}
                className="w-full border border-surface-200 rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <button onClick={createAssignment} disabled={saving} className="btn-primary btn-sm btn w-fit">
            {saving ? 'Creating...' : 'Create Assignment'}
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-sm text-ink">Assignments</h2></div>
          {loadingAssignments ? (
            <div className="p-8 text-center text-sm text-ink-muted flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading...
            </div>
          ) : assignments.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-muted">No assignments yet.</div>
          ) : (
            <div className="divide-y divide-surface-100">
              {assignments.map((a) => (
                <button
                  key={a.id}
                  onClick={() => openSubmissions(a)}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                    selectedAssignmentId === a.id ? 'bg-brand-50 text-brand-700' : 'hover:bg-surface-50 text-ink'
                  }`}
                >
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-ink-faint">Due {new Date(a.due_date).toLocaleDateString('en-NG')}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 card">
          <div className="card-header">
            <h2 className="font-semibold text-sm text-ink">
              {selectedAssignment ? `${selectedAssignment.title} — Submissions` : 'Select an assignment'}
            </h2>
          </div>
          {loadingSubmissions ? (
            <div className="p-8 text-center text-sm text-ink-muted flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading...
            </div>
          ) : !selectedAssignmentId ? (
            <div className="p-8 text-center text-sm text-ink-muted">Choose an assignment to mark submissions.</div>
          ) : (
            <div className="divide-y divide-surface-100">
              {learners.map((l) => (
                <div key={l.id} className="px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-ink">{l.last_name} {l.first_name}</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setStatus(l.id, 'submitted')}
                      className={`btn-sm btn flex items-center gap-1 ${statuses[l.id] === 'submitted' ? 'bg-green-100 text-green-700' : 'btn-secondary'}`}>
                      <CheckCircle2 size={13} /> Submitted
                    </button>
                    <button onClick={() => setStatus(l.id, 'late')}
                      className={`btn-sm btn flex items-center gap-1 ${statuses[l.id] === 'late' ? 'bg-amber-100 text-amber-700' : 'btn-secondary'}`}>
                      <Clock size={13} /> Late
                    </button>
                    <button onClick={() => setStatus(l.id, 'not_submitted')}
                      className={`btn-sm btn flex items-center gap-1 ${statuses[l.id] === 'not_submitted' ? 'bg-red-100 text-red-700' : 'btn-secondary'}`}>
                      <XCircle size={13} /> Not Submitted
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}