'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { generateReport } from '@/app/(dashboard)/reports/actions'
import { ArrowLeft, Loader2, FileText, CheckCircle, AlertCircle, Users, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'

interface Class { id: string; name: string }
interface Subject { id: string; name: string; code?: string; template_id: string | null; score_count: number; learner_count: number; is_complete: boolean }
interface Term { id: string; name: string; session_name?: string }

export default function GenerateReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preSelectedClassId = searchParams.get('class')

  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState(preSelectedClassId || '')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [learnerCount, setLearnerCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [hasScores, setHasScores] = useState(false)
  const [isInstitution, setIsInstitution] = useState(false)
  const [currentTermName, setCurrentTermName] = useState<string | null>(null)
  const [currentTermId, setCurrentTermId] = useState<string | null>(null)
  const [terms, setTerms] = useState<Term[]>([])
  const [selectedTermId, setSelectedTermId] = useState('')

  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const { data: profile } = await supabase
        .from('users').select('organization_id, role, current_term_id').eq('id', userData.user.id).single()

      const orgId = profile?.organization_id
      const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'
      setIsInstitution(!!orgId)

      let classData: { id: string; name: string }[] | null = null

      if (orgId && isAdmin) {
        // ✅ Admin sees all classes in the organization
        const res = await supabase.from('groups').select('id, name').eq('organization_id', orgId).eq('is_active', true).order('name')
        classData = res.data
      } else if (orgId && !isAdmin) {
        // ✅ Non-admin teacher: only classes where they are the CLASS TEACHER
        const { data: assignments } = await supabase
          .from('teacher_assignments')
          .select('class_id')
          .eq('teacher_id', userData.user.id)
          .eq('role', 'class_teacher')

        const classIds = [...new Set((assignments ?? []).map(a => a.class_id).filter(Boolean))]
        if (classIds.length > 0) {
          const res = await supabase.from('groups').select('id, name').in('id', classIds).eq('is_active', true).order('name')
          classData = res.data
        } else {
          classData = []
        }
      } else {
        // ✅ Solo teacher: only their own classes
        const res = await supabase.from('groups').select('id, name').eq('instructor_id', userData.user.id).eq('is_active', true).order('name')
        classData = res.data
      }

      setClasses(classData || [])
      if (!preSelectedClassId && classData && classData.length > 0) setSelectedClass(classData[0].id)

      if (orgId) {
        const { data: org } = await supabase.from('organizations').select('current_term_id').eq('id', orgId).single()
        if (org?.current_term_id) {
          const { data: term } = await supabase.from('terms').select('id, name, session:academic_sessions(name)').eq('id', org.current_term_id).single()
          setCurrentTermId(term?.id ?? null)
          setCurrentTermName(term ? `${(term.session as any)?.name ?? ''} — ${term.name}` : null)
        }
      } else {
        const { data: sessionsData } = await supabase
          .from('academic_sessions').select('id, name').eq('instructor_id', userData.user.id).order('name', { ascending: false })
        const sessionIds = (sessionsData ?? []).map(s => s.id)
        if (sessionIds.length > 0) {
          const { data: termsData } = await supabase
            .from('terms').select('id, name, session_id').in('session_id', sessionIds).order('name')
          const enriched = (termsData ?? []).map(t => ({
            id: t.id, name: t.name,
            session_name: sessionsData?.find(s => s.id === t.session_id)?.name,
          }))
          setTerms(enriched)
        }
        setSelectedTermId(profile?.current_term_id ?? '')
      }

      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    async function fetchClassData() {
      if (!selectedClass) { setSubjects([]); setHasScores(false); return }
      setLoading(true)
      try {
        const { data: learnersData } = await supabase
          .from('learners').select('id').eq('group_id', selectedClass).eq('is_active', true)
        setLearnerCount(learnersData?.length ?? 0)

        const { data: subjectsData } = await supabase
          .from('subjects').select('id, name, code, template_id')
          .eq('group_id', selectedClass).eq('is_active', true).order('name')

        if (!subjectsData?.length) { setSubjects([]); setHasScores(false); setLoading(false); return }

        const subjectIds = subjectsData.map(s => s.id)
        const learnerIds = learnersData?.map(l => l.id) || []

        let scoresData: { learner_id: string; subject_id: string; score: number }[] = []
        if (learnerIds.length > 0 && subjectIds.length > 0) {
          const { data } = await supabase.from('scores')
            .select('learner_id, subject_id, score')
            .in('learner_id', learnerIds).in('subject_id', subjectIds)
          scoresData = data || []
        }

        const subjectsWithStats = subjectsData.map(subject => {
          const subjectScores = scoresData.filter(s => s.subject_id === subject.id)
          const uniqueLearners = new Set(subjectScores.map(s => s.learner_id))
          return {
            ...subject,
            score_count: subjectScores.length,
            learner_count: uniqueLearners.size,
            is_complete: subjectScores.length > 0 && uniqueLearners.size === (learnersData?.length || 0),
          }
        })

        setSubjects(subjectsWithStats)
        setHasScores(scoresData.length > 0)
      } catch {
        toast.error('Failed to load class data')
      } finally {
        setLoading(false)
      }
    }
    fetchClassData()
  }, [selectedClass])

  const missingTemplates = subjects.filter(s => !s.template_id)

  async function handleGenerateReport() {
    if (!selectedClass) { toast.error('Please select a class'); return }
    if (missingTemplates.length > 0) {
      toast.error(`Assign a template to: ${missingTemplates.map(s => s.name).join(', ')}`)
      return
    }
    if (!isInstitution && !selectedTermId) {
      toast.error('Please select a term')
      return
    }

    setGenerating(true)
    const formData = new FormData()
    formData.append('group_id', selectedClass)
    formData.append('type', 'broadsheet')
    if (!isInstitution) formData.append('term_id', selectedTermId)

    const result = await generateReport(formData)
    setGenerating(false)

    if (!result.success) {
      toast.error(result.message || 'Failed to generate report')
      return
    }

    toast.success('Report generated!')
    router.push(`/reports/${result.reportId}`)
  }

  if (loading && classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 size={40} className="animate-spin text-brand-500 mb-4" />
        <p className="text-ink-muted">Loading classes...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/reports" className="text-sm text-ink-muted hover:text-brand-500 flex items-center gap-1 mb-1">
            <ArrowLeft size={14} /> Back to reports
          </Link>
          <h1 className="page-title">Generate Report</h1>
          <p className="page-subtitle">Review scores and generate a class broadsheet</p>
        </div>
      </div>

      {isInstitution ? (
        currentTermName ? (
          <div className="card p-4 bg-brand-50 border-brand-200 flex items-center justify-between">
            <p className="text-sm text-ink">Generating for term: <strong>{currentTermName}</strong></p>
            <Link href="/settings/academic" className="text-xs text-brand-600 hover:underline">Change term</Link>
          </div>
        ) : (
          <div className="card p-4 bg-amber-50 border-amber-200">
            <p className="text-sm text-amber-700">
              No current term set. Ask your administrator to set one in{' '}
              <Link href="/settings/academic" className="underline">Settings → Academic Periods</Link>.
            </p>
          </div>
        )
      ) : (
        <div className="card p-4">
          <label className="block text-xs font-medium text-ink mb-1">Term</label>
          {terms.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No terms set up yet. <Link href="/settings/academic" className="text-brand-500 hover:underline">Add one first</Link>.
            </p>
          ) : (
            <select value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)} className="input max-w-xs">
              <option value="">Select a term…</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.session_name} — {t.name}</option>)}
            </select>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
            <BookOpen size={16} className="text-ink-muted" /> Step 1: Select Class
          </h2>
        </div>
        <div className="px-5 py-4">
          {classes.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-ink-muted mb-2">No classes available to generate reports for</p>
              {isInstitution ? (
                <p className="text-xs text-ink-faint">Only classes where you are the class teacher are shown</p>
              ) : (
                <Link href="/classes/new" className="btn-primary btn-sm btn">Create a class first</Link>
              )}
            </div>
          ) : (
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              disabled={loading}>
              <option value="">Select a class...</option>
              {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {selectedClass && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <FileText size={16} className="text-ink-muted" /> Step 2: Review Scores
            </h2>
            <div className="flex items-center gap-4 text-xs text-ink-muted">
              <span><Users size={14} className="inline mr-1" />{learnerCount} students</span>
              <span><BookOpen size={14} className="inline mr-1" />{subjects.length} subjects</span>
              <span><CheckCircle size={14} className="inline mr-1 text-green-600" />{subjects.filter(s => s.is_complete).length} complete</span>
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-12 text-center">
              <Loader2 size={32} className="animate-spin text-brand-500 mx-auto mb-3" />
              <p className="text-sm text-ink-muted">Loading...</p>
            </div>
          ) : subjects.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-ink-muted mb-2">No subjects found</p>
              <Link href="/settings/subjects/new" className="btn-primary btn-sm btn">Add subjects</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-ink-muted uppercase">Subject</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-ink-muted uppercase">Template</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-ink-muted uppercase">Scores</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-ink-muted uppercase">Students</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-ink-muted uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(subject => (
                    <tr key={subject.id} className="border-b border-surface-100 hover:bg-surface-50">
                      <td className="px-4 py-2 font-medium text-ink">
                        {subject.name}
                        {subject.code && <span className="text-xs text-ink-faint ml-2 font-mono">{subject.code}</span>}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {subject.template_id ? (
                          <span className="text-xs text-green-600">✓ Assigned</span>
                        ) : (
                          <span className="text-xs text-red-600 font-medium">⚠ Missing</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center font-mono">{subject.score_count}</td>
                      <td className="px-4 py-2 text-center font-mono">{subject.learner_count}/{learnerCount}</td>
                      <td className="px-4 py-2 text-center">
                        {subject.is_complete ? (
                          <span className="text-xs text-green-600 font-medium flex items-center justify-center gap-1"><CheckCircle size={12} /> Complete</span>
                        ) : subject.score_count > 0 ? (
                          <span className="text-xs text-amber-600 font-medium flex items-center justify-center gap-1"><AlertCircle size={12} /> Partial</span>
                        ) : (
                          <span className="text-xs text-ink-faint flex items-center justify-center gap-1"><AlertCircle size={12} /> No scores</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {missingTemplates.length > 0 && (
            <div className="px-5 py-3 bg-red-50 border-t border-red-100">
              <p className="text-xs text-red-700">
                Assign a template to {missingTemplates.map(s => s.name).join(', ')} in{' '}
                <Link href="/settings/subjects" className="underline">Settings → Subjects</Link> before generating.
              </p>
            </div>
          )}

          <div className="px-5 py-4 border-t border-surface-100 flex items-center justify-between">
            <span className={`text-xs font-medium flex items-center gap-1 ${hasScores ? 'text-green-600' : 'text-amber-600'}`}>
              {hasScores ? <><CheckCircle size={14} /> Scores found</> : <><AlertCircle size={14} /> No scores found</>}
            </span>
            <button
              onClick={handleGenerateReport}
              disabled={generating || !hasScores || subjects.length === 0 || missingTemplates.length > 0 || (isInstitution && !currentTermName) || (!isInstitution && !selectedTermId)}
              className="btn-primary btn flex items-center gap-2"
            >
              {generating ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><FileText size={16} /> Generate Now</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
