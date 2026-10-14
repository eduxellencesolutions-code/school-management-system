'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Status = 'present' | 'late' | 'absent' | 'excused'
const STATUSES: Status[] = ['present', 'late', 'absent', 'excused']

export default function CourseAttendancePage() {
  const supabase = createClient()
  const [courses, setCourses] = useState<any[]>([])
  const [subjectId, setSubjectId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [lecture, setLecture] = useState(1)
  const [topic, setTopic] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [roster, setRoster] = useState<any[]>([])
  const [marks, setMarks] = useState<Record<string, Status>>({})
  const [busy, setBusy] = useState(false)
  const course = courses.find(c => c.subject_id === subjectId)

  useEffect(() => {
    supabase.rpc('get_my_attendance_courses').then(({ data, error }) => {
      if (error) { toast.error(error.message); return }
      setCourses(data ?? [])
      if (data?.[0]) setSubjectId(data[0].subject_id)
    })
  }, [])

  async function openSession() {
    if (!course?.term_id) { toast.error('Set the current academic term first (Settings → Academic Periods).'); return }
    setBusy(true)
    const { data, error } = await supabase.rpc('open_course_attendance_session', {
      p_subject_id: subjectId, p_term_id: course.term_id, p_date: date, p_lecture_no: lecture, p_topic: topic || null,
    })
    if (error) { toast.error(error.message); setBusy(false); return }
    setSessionId(data.session_id)
    const { data: r, error: e2 } = await supabase.rpc('get_course_attendance_roster', { p_session_id: data.session_id })
    if (e2) toast.error(e2.message)
    setRoster(r ?? [])
    const m: Record<string, Status> = {}
    ;(r ?? []).forEach((x: any) => { m[x.learner_id] = (x.status as Status) ?? 'present' })
    setMarks(m)
    setBusy(false)
  }

  async function save() {
    if (!sessionId) return
    setBusy(true)
    const entries = roster.map(x => ({ learner_id: x.learner_id, status: marks[x.learner_id] ?? 'present' }))
    const { data, error } = await supabase.rpc('record_course_attendance', { p_session_id: sessionId, p_entries: entries })
    setBusy(false)
    if (error) { toast.error(error.message); return }
    toast.success(`Saved ${data.recorded} record${data.recorded === 1 ? '' : 's'}${data.rejected?.length ? `, ${data.rejected.length} skipped` : ''}`)
  }

  return (
    <div className="max-w-3xl flex flex-col gap-4">
      <div><h1 className="page-title">Course attendance</h1><p className="page-subtitle">Record attendance for your assigned courses.</p></div>
      {courses.length === 0 && <div className="card p-4 text-sm text-ink-muted">No courses are assigned to you yet.</div>}
      {courses.length > 0 && (
        <div className="card p-4 grid sm:grid-cols-2 gap-3">
          <select className="input" value={subjectId} onChange={e => { setSubjectId(e.target.value); setSessionId(null); setRoster([]) }}>
            {courses.map(c => <option key={c.subject_id} value={c.subject_id}>{c.code ? `${c.code} — ` : ''}{c.name} ({c.registered} registered)</option>)}
          </select>
          <input type="date" className="input" value={date} max={new Date().toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)} />
          <input type="number" min={1} max={20} className="input" value={lecture} onChange={e => setLecture(Number(e.target.value) || 1)} placeholder="Lecture number" />
          <input className="input" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic (optional)" />
          <button onClick={openSession} disabled={busy || !subjectId} className="btn-primary btn sm:col-span-2">
            {busy ? <Loader2 size={14} className="animate-spin" /> : sessionId ? 'Reload this session' : 'Open session'}</button>
        </div>
      )}
      {sessionId && (
        <div className="card divide-y divide-surface-100">
          {roster.map(x => (
            <div key={x.learner_id} className="px-4 py-2 flex items-center justify-between gap-3">
              <div><p className="text-sm font-medium text-ink">{x.last_name} {x.first_name}</p>
                {x.admission_number && <p className="text-xs text-ink-faint font-mono">{x.admission_number}</p>}</div>
              <div className="flex gap-1">
                {STATUSES.map(s => (
                  <button key={s} onClick={() => setMarks(m => ({ ...m, [x.learner_id]: s }))}
                    className={`btn-sm btn ${marks[x.learner_id] === s ? 'bg-brand-500 text-white' : 'btn-secondary'}`}>{s[0].toUpperCase() + s.slice(1)}</button>))}
              </div>
            </div>))}
          <div className="p-4"><button onClick={save} disabled={busy || roster.length === 0} className="btn-primary btn">{busy ? 'Saving…' : 'Save attendance'}</button></div>
        </div>
      )}
    </div>
  )
}