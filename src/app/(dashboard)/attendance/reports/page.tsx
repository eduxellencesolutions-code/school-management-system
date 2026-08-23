// src/app/(dashboard)/attendance/reports/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { pdf } from '@react-pdf/renderer'
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { Loader2, FileDown, FileSpreadsheet, Download } from 'lucide-react'
import { AttendanceReportPDF } from '@/components/attendance/AttendanceReportPDF'
import { DailyRegisterPDF } from '@/components/attendance/DailyRegisterPDF'

interface ClassOption { id: string; name: string }
interface TermOption { id: string; name: string; session_name?: string }

export default function AttendanceReportsPage() {
  const supabase = createClient()
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [terms, setTerms] = useState<TermOption[]>([])
  const [groupId, setGroupId] = useState('')
  const [termId, setTermId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [generating, setGenerating] = useState<'report' | 'register' | 'excel' | null>(null)
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('users').select('organization_id, role, name').eq('id', user.id).single()
      setUserName(profile?.name ?? '')
      setUserRole(profile?.role ?? '')

      const groupsQuery = supabase.from('groups').select('id, name').eq('type', 'class').eq('is_active', true).order('name')
      const { data: groupData } = profile?.organization_id
        ? await groupsQuery.eq('organization_id', profile.organization_id)
        : await groupsQuery.eq('instructor_id', user.id)
      setClasses(groupData ?? [])
      if (groupData && groupData.length > 0) setGroupId(groupData[0].id)

      const sessionsQuery = profile?.organization_id
        ? supabase.from('academic_sessions').select('id').eq('organization_id', profile.organization_id)
        : supabase.from('academic_sessions').select('id').eq('instructor_id', user.id)
      const { data: sessions } = await sessionsQuery
      const sessionIds = (sessions ?? []).map(s => s.id)
      if (sessionIds.length > 0) {
        const { data: termsData } = await supabase
          .from('terms').select('id, name, session_id, session:academic_sessions(name)')
          .in('session_id', sessionIds).order('name')
        const enriched = (termsData ?? []).map((t: any) => ({ id: t.id, name: t.name, session_name: t.session?.name }))
        setTerms(enriched)
        if (enriched.length > 0) setTermId(enriched[0].id)
      }
    }
    load()
  }, [])

  async function fetchReportData(): Promise<any> {
    const params = new URLSearchParams({ groupId, termId, startDate, endDate })
    const res = await fetch(`/api/attendance/report?${params}`)
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return data
  }

  async function generateReport() {
    if (!groupId || !termId || !startDate || !endDate) { toast.error('Select class, term and date range'); return }
    setGenerating('report')
    try {
      const data = await fetchReportData()
      const doc = (
        <AttendanceReportPDF
          school={data.school} classInfo={data.class} term={data.term} period={data.period}
          schoolDays={data.school_days} students={data.students}
          preparedByName={userName} preparedByTitle={userRole === 'admin' ? 'School Admin' : 'Class Teacher'}
        />
      )
      const blob = await pdf(doc).toBlob()
      saveAs(blob, `${data.class.name}_Attendance_Report_${startDate}_to_${endDate}.pdf`)
      toast.success('Report generated')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate report')
    } finally {
      setGenerating(null)
    }
  }

  async function generateRegister() {
    if (!groupId || !termId || !startDate || !endDate) { toast.error('Select class, term and date range'); return }
    setGenerating('register')
    try {
      const data = await fetchReportData()
      const doc = (
        <DailyRegisterPDF school={data.school} classInfo={data.class} term={data.term}
          students={data.students} dailyRegister={data.daily_register} />
      )
      const blob = await pdf(doc).toBlob()
      saveAs(blob, `${data.class.name}_Daily_Register_${startDate}_to_${endDate}.pdf`)
      toast.success('Register generated')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate register')
    } finally {
      setGenerating(null)
    }
  }

  async function generateExcel() {
    if (!groupId || !termId || !startDate || !endDate) { toast.error('Select class, term and date range'); return }
    setGenerating('excel')
    try {
      const data = await fetchReportData()
      const headers = ['#', 'Student', 'Adm. No', 'Present', 'Absent', 'Late', 'Attendance %']
      const rows = data.students.map((s: any, i: number) => [
        i + 1, `${s.last_name} ${s.first_name}`, s.admission_number ?? '',
        s.days_present, s.days_absent, s.days_late, s.attendance_percentage ?? '',
      ])
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet([[`${data.class.name} — Attendance Report`], [], headers, ...rows])
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance')
      XLSX.writeFile(wb, `${data.class.name}_Attendance_${startDate}_to_${endDate}.xlsx`)
      toast.success('Excel downloaded')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate Excel')
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <div>
        <h1 className="page-title">Attendance Reports</h1>
        <p className="page-subtitle">Generate inspection-ready attendance reports and daily registers.</p>
      </div>

      <div className="card p-5 flex flex-col gap-3">
        <div>
          <label className="block text-xs font-medium text-ink mb-1">Class</label>
          <select value={groupId} onChange={e => setGroupId(e.target.value)} className="input">
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink mb-1">Term</label>
          <select value={termId} onChange={e => setTermId(e.target.value)} className="input">
            {terms.map(t => <option key={t.id} value={t.id}>{t.session_name} — {t.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap pt-2 border-t border-surface-100">
          <button onClick={generateReport} disabled={generating !== null} className="btn-primary btn-sm btn flex items-center gap-1.5">
            {generating === 'report' ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />} Attendance Report PDF
          </button>
          <button onClick={generateRegister} disabled={generating !== null} className="btn-secondary btn-sm btn flex items-center gap-1.5">
            {generating === 'register' ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />} Daily Register PDF
          </button>
          <button onClick={generateExcel} disabled={generating !== null} className="btn-secondary btn-sm btn flex items-center gap-1.5">
            {generating === 'excel' ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />} Excel
          </button>
        </div>
      </div>
    </div>
  )
}