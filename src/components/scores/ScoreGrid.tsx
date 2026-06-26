'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { debounce, formatScore, cn } from '@/lib/utils'
import { Save, Download, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Learner { id: string; first_name: string; last_name: string; admission_number?: string }
interface Component { id: string; name: string; max_score: number; sequence: number }
interface Subject { id: string; name: string; code?: string }
interface ScoreMap { [learnerId: string]: { [componentId: string]: { value: number | null; status: 'idle' | 'saving' | 'saved' | 'error' } } }

interface Props {
  groupId: string
  subjectId: string
  learners: Learner[]
  components: Component[]
  subject: Subject
  existingScores: { learner_id: string; component_id: string; score: number | null }[]
}

export default function ScoreGrid({ groupId, subjectId, learners, components, subject, existingScores }: Props) {
  const supabase = createClient()
  const [scores, setScores] = useState<ScoreMap>(() => {
    const map: ScoreMap = {}
    for (const l of learners) {
      map[l.id] = {}
      for (const c of components) {
        const existing = existingScores.find(s => s.learner_id === l.id && s.component_id === c.id)
        map[l.id][c.id] = { value: existing?.score ?? null, status: 'idle' }
      }
    }
    return map
  })

  // Properly typed save function with useCallback
  const saveScore = useCallback(async (learnerId: string, componentId: string, value: number | null) => {
    setScores(prev => ({
      ...prev,
      [learnerId]: { ...prev[learnerId], [componentId]: { value, status: 'saving' } },
    }))

    const component = components.find(c => c.id === componentId)
    if (component && value !== null && value > component.max_score) {
      setScores(prev => ({
        ...prev,
        [learnerId]: { ...prev[learnerId], [componentId]: { value, status: 'error' } },
      }))
      toast.error(`Score cannot exceed ${component.max_score}`)
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase.from('scores').upsert({
      learner_id: learnerId,
      subject_id: subjectId,
      component_id: componentId,
      score: value,
      entered_by: userData.user?.id,
    }, { onConflict: 'learner_id,subject_id,component_id' })

    setScores(prev => ({
      ...prev,
      [learnerId]: {
        ...prev[learnerId],
        [componentId]: { value, status: error ? 'error' : 'saved' },
      },
    }))

    if (error) toast.error('Failed to save score')
  }, [supabase, subjectId, components])

  // FIX: Use a simple timeout-based debounce instead of the utility function
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const debouncedSave = useCallback((learnerId: string, componentId: string, value: number | null) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Set a new timeout
    timeoutRef.current = setTimeout(() => {
      saveScore(learnerId, componentId, value)
      timeoutRef.current = null
    }, 600)
  }, [saveScore])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  function handleChange(learnerId: string, componentId: string, raw: string) {
    const value = raw === '' ? null : parseFloat(raw)
    setScores(prev => ({
      ...prev,
      [learnerId]: { ...prev[learnerId], [componentId]: { value, status: 'idle' } },
    }))
    // Call debounced save
    debouncedSave(learnerId, componentId, value)
  }

  function getRowTotal(learnerId: string): number {
    return Object.values(scores[learnerId] ?? {}).reduce((sum, cell) => sum + (cell.value ?? 0), 0)
  }

  function getMaxTotal(): number {
    return components.reduce((sum, c) => sum + c.max_score, 0)
  }

  function exportToExcel() {
    const rows = learners.map((l, i) => {
      const row: Record<string, unknown> = {
        '#': i + 1,
        'Admission No': l.admission_number ?? '',
        'Student Name': `${l.last_name} ${l.first_name}`,
      }
      for (const c of components) {
        row[`${c.name} (${c.max_score})`] = scores[l.id]?.[c.id]?.value ?? ''
      }
      row['Total'] = getRowTotal(l.id)
      row['Max'] = getMaxTotal()
      row['%'] = getMaxTotal() > 0 ? ((getRowTotal(l.id) / getMaxTotal()) * 100).toFixed(1) : ''
      return row
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, subject.name.slice(0, 31))
    XLSX.writeFile(wb, `${subject.name}_scores.xlsx`)
    toast.success('Excel file downloaded')
  }

  const sortedComponents = [...components].sort((a, b) => a.sequence - b.sequence)
  const allSaved = Object.values(scores).every(s => Object.values(s).every(c => c.status !== 'saving'))

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-ink">{subject.name}</h2>
          {subject.code && <span className="badge badge-gray">{subject.code}</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded',
            allSaved ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50'
          )}>
            {allSaved
              ? <><CheckCircle2 size={12} /> All saved</>
              : <><Loader2 size={12} className="animate-spin" /> Saving…</>
            }
          </div>
          <button onClick={exportToExcel} className="btn-secondary btn-sm btn">
            <Download size={13} /> Export Excel
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider w-8">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider min-w-[160px]">Student</th>
                {sortedComponents.map(c => (
                  <th key={c.id} className="px-3 py-3 text-center text-xs font-semibold text-ink-muted uppercase tracking-wider min-w-[80px]">
                    <div>{c.name}</div>
                    <div className="text-[10px] font-normal text-ink-faint">/{c.max_score}</div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-semibold text-ink-muted uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-ink-muted uppercase tracking-wider">%</th>
              </tr>
            </thead>
            <tbody>
              {learners.map((learner, i) => {
                const total = getRowTotal(learner.id)
                const maxTotal = getMaxTotal()
                const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0

                return (
                  <tr key={learner.id} className="border-b border-surface-200 hover:bg-surface-50/50 transition-colors">
                    <td className="px-4 py-2 text-xs text-ink-muted">{i + 1}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium text-ink text-sm">{learner.last_name} {learner.first_name}</div>
                      {learner.admission_number && (
                        <div className="text-[11px] text-ink-faint font-mono">{learner.admission_number}</div>
                      )}
                    </td>
                    {sortedComponents.map(c => {
                      const cell = scores[learner.id]?.[c.id]
                      return (
                        <td key={c.id} className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            max={c.max_score}
                            step="0.5"
                            value={cell?.value ?? ''}
                            onChange={e => handleChange(learner.id, c.id, e.target.value)}
                            className={cn(
                              'score-cell',
                              cell?.status === 'saved'  && 'saved',
                              cell?.status === 'saving' && 'saving',
                              cell?.status === 'error'  && 'error',
                            )}
                            placeholder="-"
                          />
                        </td>
                      )
                    })}
                    <td className="px-4 py-2 text-center font-semibold text-ink text-sm font-mono">
                      {total > 0 ? total : '-'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={cn(
                        'text-xs font-semibold px-1.5 py-0.5 rounded',
                        pct >= 70 ? 'bg-green-100 text-green-700' :
                        pct >= 50 ? 'bg-amber-100 text-amber-700' :
                        pct >= 40 ? 'bg-orange-100 text-orange-700' :
                        total > 0 ? 'bg-red-100 text-red-700' : 'text-ink-faint'
                      )}>
                        {total > 0 ? `${pct.toFixed(0)}%` : '-'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {/* Footer: column averages */}
            <tfoot>
              <tr className="bg-surface-50 border-t-2 border-surface-200">
                <td colSpan={2} className="px-4 py-2 text-xs font-semibold text-ink-muted uppercase">
                  Class average
                </td>
                {sortedComponents.map(c => {
                  const vals = learners
                    .map(l => scores[l.id]?.[c.id]?.value)
                    .filter((v): v is number => v !== null && v !== undefined)
                  const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
                  return (
                    <td key={c.id} className="px-2 py-2 text-center text-xs font-semibold text-ink font-mono">
                      {avg !== null ? avg.toFixed(1) : '-'}
                    </td>
                  )
                })}
                <td className="px-4 py-2 text-center text-xs font-semibold text-ink font-mono">
                  {(() => {
                    const totals = learners.map(l => getRowTotal(l.id)).filter(t => t > 0)
                    return totals.length > 0
                      ? (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1)
                      : '-'
                  })()}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-ink-muted">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-100 border border-green-300" /> Saved</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-100 border border-amber-300" /> Saving…</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-100 border border-red-300" /> Error</div>
        <span className="ml-auto">Scores auto-save as you type • No save button needed</span>
      </div>
    </div>
  )
}