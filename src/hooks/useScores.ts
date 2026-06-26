import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface ScoreRecord {
  id: string
  learner_id: string
  subject_id: string
  component_id: string
  score: number | null
  is_final: boolean
}

interface UseScoresOptions {
  subjectId: string
  learnerIds: string[]
  enabled?: boolean
}

export function useScores({ subjectId, learnerIds, enabled = true }: UseScoresOptions) {
  const supabase = createClient()
  const [scores, setScores]   = useState<ScoreRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // Initial fetch
  useEffect(() => {
    if (!enabled || !subjectId || learnerIds.length === 0) {
      setLoading(false)
      return
    }

    async function fetchScores() {
      setLoading(true)
      const { data, error: fetchErr } = await supabase
        .from('scores')
        .select('id, learner_id, subject_id, component_id, score, is_final')
        .eq('subject_id', subjectId)
        .in('learner_id', learnerIds)

      if (fetchErr) {
        setError(fetchErr.message)
      } else {
        setScores(data ?? [])
      }
      setLoading(false)
    }

    fetchScores()
  }, [subjectId, learnerIds.join(','), enabled]) // eslint-disable-line

  // Real-time subscription
  useEffect(() => {
    if (!enabled || !subjectId || learnerIds.length === 0) return

    const channel = supabase
      .channel(`scores:subject:${subjectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scores',
          filter: `subject_id=eq.${subjectId}`,
        },
        (payload: RealtimePostgresChangesPayload<ScoreRecord>) => {
          setScores(prev => {
            if (payload.eventType === 'INSERT') {
              return [...prev, payload.new as ScoreRecord]
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map(s =>
                s.id === (payload.new as ScoreRecord).id ? (payload.new as ScoreRecord) : s
              )
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter(s => s.id !== (payload.old as ScoreRecord).id)
            }
            return prev
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [subjectId, enabled]) // eslint-disable-line

  // Helper: get score for a learner + component
  const getScore = useCallback(
    (learnerId: string, componentId: string): number | null => {
      return scores.find(
        s => s.learner_id === learnerId && s.component_id === componentId
      )?.score ?? null
    },
    [scores]
  )

  // Helper: is score finalised?
  const isFinal = useCallback(
    (learnerId: string, componentId: string): boolean => {
      return scores.find(
        s => s.learner_id === learnerId && s.component_id === componentId
      )?.is_final ?? false
    },
    [scores]
  )

  return { scores, loading, error, getScore, isFinal }
}
