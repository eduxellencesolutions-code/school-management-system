'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

export default function CourseAttendanceReports() {
  const supabase = createClient()
  const [courses, setCourses] = useState<any[]>([])
  const [subjectId, setSubjectId] = useState('')
  const [report, setReport] = useState<any>(null)
  const course = courses.find(c => c.subject_id === subjectId)

  useEffect(() => {
    supabase.rpc('get_org_course_attendance_summary').then(async ({ data, error }) => {
      if (error) { toast.error(error.message); return }
      let list = data ?? []
      if (list.length === 0) { const mine = await supabase.rpc('get_my_attendance_courses'); list = mine.data ?? [] }
      setCourses(list)
      if (list[0]) setSubjectId(list[0].subject_id)
    })
  }, [])

  useEffect(() => {
    if (!course?.term_id) { setReport(null); return }
    supabase.rpc('get_course_attendance_report', { p_subject_id: subjectId, p_term_id: course.term_id })
      .then(({ data, error }) => { if (error) toast.error(error.message); else setReport(data) })
  }, [subjectId, courses.length])

  function exportCsv() {
    if (!report) return
    const head = ['Admission No', 'Last name', 'First name', 'Present', 'Late', 'Absent', 'Excused', 'Attendance %', 'Below 75%']
    const rows = report.students.map((s: any) => [s.admission_number ?? '', s.last_name, s.first_name, s.present, s.late, s.absent, s.excused, s.attendance_percentage ?? '', s.below_75 ? 'yes' : 'no'])
    const csv = [head, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `attendance-${report.course.code ?? 'course'}.csv`
    a.click()
  }

  return (
    <div className="max-w-4xl flex flex-col gap-4">
      <div><h1 className="page-title">Course attendance reports</h1></div>
      <select className="input max-w-md" value={subjectId} onChange={e => setSubjectId(e.target.value)}>
        {courses.map(c => <option key={c.subject_id} value={c.subject_id}>{c.code ? `${c.code} — ` : ''}{c.name}</option>)}
      </select>
      {report && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span className="text-sm text-ink">{report.sessions_held} session{report.sessions_held === 1 ? '' : 's'} held</span>
            <button onClick={exportCsv} className="btn-secondary btn-sm btn">Export CSV</button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-ink-faint uppercase"><th className="p-2">Student</th><th>P</th><th>L</th><th>A</th><th>E</th><th>%</th></tr></thead>
            <tbody>
              {report.students.map((s: any) => (
                <tr key={s.learner_id} className="border-t border-surface-100">
                  <td className="p-2">{s.last_name} {s.first_name} <span className="text-xs text-ink-faint">{s.admission_number}</span></td>
                  <td>{s.present}</td><td>{s.late}</td><td>{s.absent}</td><td>{s.excused}</td>
                  <td className={s.below_75 ? 'text-amber-700 font-medium' : ''}>{s.attendance_percentage ?? '—'}{s.below_75 ? ' ⚑' : ''}</td>
                </tr>))}
            </tbody>
          </table>
          <p className="p-3 text-xs text-ink-faint">{report.policy_note}</p>
        </div>
      )}
    </div>
  )
}