'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2, FileText, CheckCircle, AlertCircle, Users, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'

interface Class {
  id: string
  name: string
}

interface Subject {
  id: string
  name: string
  code?: string
  score_count: number
  learner_count: number
  is_complete: boolean
}

interface Learner {
  id: string
  first_name: string
  last_name: string
  admission_number: string
  scores: {
    subject_id: string
    score: number
  }[]
}

export default function GenerateReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preSelectedClassId = searchParams.get('class')

  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState<string>(preSelectedClassId || '')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [learners, setLearners] = useState<Learner[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [hasScores, setHasScores] = useState(false)

  const supabase = createClient()

  // Fetch classes on load
  useEffect(() => {
    async function fetchClasses() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', userData.user.id)
        .single()

      if (!profile?.organization_id) return

      const { data } = await supabase
        .from('groups')
        .select('id, name')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .order('name')

      setClasses(data || [])
      if (!preSelectedClassId && data && data.length > 0) {
        setSelectedClass(data[0].id)
      }
      setLoading(false)
    }
    fetchClasses()
  }, [supabase, preSelectedClassId])

  // Fetch subjects, learners, and scores when class changes
  useEffect(() => {
    async function fetchClassData() {
      if (!selectedClass) {
        setSubjects([])
        setLearners([])
        setHasScores(false)
        return
      }

      setLoading(true)
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) return

        const { data: profile } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', userData.user.id)
          .single()

        if (!profile?.organization_id) return

        // Fetch learners in this class
        const { data: learnersData } = await supabase
          .from('learners')
          .select('id, first_name, last_name, admission_number')
          .eq('group_id', selectedClass)
          .eq('is_active', true)
          .order('last_name')

        setLearners(learnersData || [])

        // Fetch subjects for this class
        const { data: subjectsData } = await supabase
          .from('subjects')
          .select(`
            id,
            name,
            code
          `)
          .eq('group_id', selectedClass)
          .eq('organization_id', profile.organization_id)
          .eq('is_active', true)
          .order('name')

        if (!subjectsData || subjectsData.length === 0) {
          setSubjects([])
          setHasScores(false)
          setLoading(false)
          return
        }

        const subjectIds = subjectsData.map(s => s.id)
        const learnerIds = learnersData?.map(l => l.id) || []

        // Fetch scores for all learners and subjects
        let scoresData: { learner_id: string; subject_id: string; score: number }[] = []
        if (learnerIds.length > 0 && subjectIds.length > 0) {
          const { data } = await supabase
            .from('scores')
            .select('learner_id, subject_id, score')
            .in('learner_id', learnerIds)
            .in('subject_id', subjectIds)

          scoresData = data || []
        }

        // Build subject objects with score counts
        const subjectsWithStats = subjectsData.map(subject => {
          const subjectScores = scoresData.filter(s => s.subject_id === subject.id)
          const uniqueLearners = new Set(subjectScores.map(s => s.learner_id))
          const totalLearners = learnersData?.length || 0
          const hasAnyScores = subjectScores.length > 0

          return {
            ...subject,
            score_count: subjectScores.length,
            learner_count: uniqueLearners.size,
            is_complete: hasAnyScores && uniqueLearners.size === totalLearners
          }
        })

        setSubjects(subjectsWithStats)
        setHasScores(scoresData.length > 0)

        // Build learner score objects
        const learnersWithScores = (learnersData || []).map(learner => {
          const learnerScores = scoresData
            .filter(s => s.learner_id === learner.id)
            .map(s => ({
              subject_id: s.subject_id,
              score: s.score
            }))

          return {
            ...learner,
            scores: learnerScores
          }
        })

        setLearners(learnersWithScores)
      } catch (error) {
        console.error('Error fetching class data:', error)
        toast.error('Failed to load class data')
      } finally {
        setLoading(false)
      }
    }

    fetchClassData()
  }, [selectedClass, supabase])

  const handleGenerateReport = async () => {
    if (!selectedClass) {
      toast.error('Please select a class')
      return
    }

    setGenerating(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        toast.error('Please sign in')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('id, organization_id')
        .eq('id', userData.user.id)
        .single()

      // Create report record
      const { data: report, error } = await supabase
        .from('reports')
        .insert({
          organization_id: profile?.organization_id,
          group_id: selectedClass,
          type: 'broadsheet',
          filters: { class_id: selectedClass },
          status: 'processing',
          created_by: userData.user.id,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Report generated successfully!')

      // Navigate to preview page with report ID
      router.push(`/reports/preview?id=${report.id}`)
    } catch (error) {
      console.error('Error generating report:', error)
      toast.error('Failed to generate report. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const getClassLearnerCount = () => {
    return learners.length
  }

  const getClassSubjectCount = () => {
    return subjects.length
  }

  const getCompletedSubjectCount = () => {
    return subjects.filter(s => s.is_complete).length
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/reports" className="text-sm text-ink-muted hover:text-brand-500 flex items-center gap-1 mb-1">
            <ArrowLeft size={14} /> Back to reports
          </Link>
          <h1 className="page-title">Generate Report</h1>
          <p className="page-subtitle">Review scores and generate a class broadsheet</p>
        </div>
      </div>

      {/* Step 1: Class Selection */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
            <BookOpen size={16} className="text-ink-muted" />
            Step 1: Select Class
          </h2>
        </div>
        <div className="px-5 py-4">
          {classes.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-ink-muted mb-2">No classes available</p>
              <Link href="/classes/new" className="btn-primary btn-sm btn">
                Create a class first
              </Link>
            </div>
          ) : (
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
              disabled={loading}
            >
              <option value="">Select a class...</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Step 2: Review Scores */}
      {selectedClass && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <FileText size={16} className="text-ink-muted" />
              Step 2: Review Scores
            </h2>
            <div className="flex items-center gap-4 text-xs text-ink-muted">
              <span className="flex items-center gap-1">
                <Users size={14} /> {getClassLearnerCount()} students
              </span>
              <span className="flex items-center gap-1">
                <BookOpen size={14} /> {getClassSubjectCount()} subjects
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle size={14} className="text-green-600" /> {getCompletedSubjectCount()} complete
              </span>
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-12 text-center">
              <Loader2 size={32} className="animate-spin text-brand-500 mx-auto mb-3" />
              <p className="text-sm text-ink-muted">Loading subjects and scores...</p>
            </div>
          ) : subjects.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <FileText size={32} className="text-surface-200 mx-auto mb-3" />
              <p className="text-sm text-ink-muted mb-2">No subjects found for this class</p>
              <Link href="/settings/subjects/new" className="btn-primary btn-sm btn">
                Add subjects
              </Link>
            </div>
          ) : (
            <>
              {/* Subject Summary Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-200">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="text-center px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">
                        Scores Entered
                      </th>
                      <th className="text-center px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">
                        Students with Scores
                      </th>
                      <th className="text-center px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((subject) => (
                      <tr key={subject.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                        <td className="px-4 py-2 font-medium text-ink">
                          {subject.name}
                          {subject.code && (
                            <span className="text-xs text-ink-faint ml-2 font-mono">{subject.code}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center font-mono">{subject.score_count}</td>
                        <td className="px-4 py-2 text-center font-mono">
                          {subject.learner_count} / {learners.length}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {subject.is_complete ? (
                            <span className="text-xs text-green-600 font-medium flex items-center justify-center gap-1">
                              <CheckCircle size={12} /> Complete
                            </span>
                          ) : subject.score_count > 0 ? (
                            <span className="text-xs text-amber-600 font-medium flex items-center justify-center gap-1">
                              <AlertCircle size={12} /> Partial
                            </span>
                          ) : (
                            <span className="text-xs text-ink-faint font-medium flex items-center justify-center gap-1">
                              <AlertCircle size={12} /> No scores
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Student Score Grid (collapsible preview) */}
              {learners.length > 0 && subjects.length > 0 && (
                <div className="px-5 py-3 border-t border-surface-100">
                  <details className="group">
                    <summary className="text-sm font-medium text-ink-muted hover:text-ink cursor-pointer flex items-center gap-2">
                      <Users size={14} />
                      View student score grid ({learners.length} students × {subjects.length} subjects)
                      <span className="text-xs text-ink-faint ml-2">(click to expand)</span>
                    </summary>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-surface-200">
                            <th className="text-left px-2 py-1.5 font-semibold text-ink-muted sticky left-0 bg-white z-10">
                              Student
                            </th>
                            {subjects.map((subj) => (
                              <th key={subj.id} className="text-center px-2 py-1.5 font-semibold text-ink-muted min-w-[50px]">
                                {subj.code || subj.name.slice(0, 4)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {learners.map((learner) => {
                            const scoreMap = new Map()
                            learner.scores.forEach(s => {
                              scoreMap.set(s.subject_id, s.score)
                            })
                            return (
                              <tr key={learner.id} className="border-b border-surface-100 hover:bg-surface-50">
                                <td className="px-2 py-1.5 font-medium text-ink sticky left-0 bg-white whitespace-nowrap">
                                  {`${learner.last_name} ${learner.first_name.slice(0, 1)}.`}
                                  <span className="text-[10px] text-ink-faint ml-1 font-mono">{learner.admission_number}</span>
                                </td>
                                {subjects.map((subj) => (
                                  <td key={subj.id} className="text-center px-2 py-1.5 font-mono">
                                    {scoreMap.has(subj.id) ? (
                                      <span className="font-medium">{scoreMap.get(subj.id)}</span>
                                    ) : (
                                      <span className="text-ink-faint">—</span>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>
              )}
            </>
          )}

          {/* Generate Button */}
          <div className="px-5 py-4 border-t border-surface-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {hasScores ? (
                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle size={14} /> Scores found for this class
                </span>
              ) : (
                <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                  <AlertCircle size={14} /> No scores found for this class
                </span>
              )}
              <span className="text-xs text-ink-faint">
                {subjects.filter(s => s.is_complete).length}/{subjects.length} subjects complete
              </span>
            </div>
            <button
              onClick={handleGenerateReport}
              disabled={generating || !hasScores || subjects.length === 0}
              className="btn-primary btn flex items-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <FileText size={16} /> Generate Now
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}