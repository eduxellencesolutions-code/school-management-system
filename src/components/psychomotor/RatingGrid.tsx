'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ClassOption {
  id: string
  name: string
}

interface Learner {
  id: string
  first_name: string
  last_name: string
  admission_number: string | null
}

interface Props {
  classes: ClassOption[]
  termId: string
}

const AFFECTIVE_TRAITS = [
  'Punctuality',
  'Regularity/Attendance',
  'Neatness',
  'Responsibility',
  'Self-Control',
  'Cooperation',
  'Respect',
  'Honesty',
  'Leadership',
  'Initiative',
  'Perseverance',
  'Attitude to Learning',
  'Obedience',
  'Courtesy',
  'Relationship with Others',
]

const PSYCHOMOTOR_TRAITS = [
  'Handwriting',
  'Drawing/Artistic Skills',
  'Practical Skills',
  'Physical Fitness',
  'Coordination',
  'Manual Dexterity',
  'Sports Participation',
  'Use of Tools/Equipment',
  'Creativity',
  'Craftsmanship',
]

const RATING_SCALE = [
  { value: 5, label: 'Excellent' },
  { value: 4, label: 'Very Good' },
  { value: 3, label: 'Good' },
  { value: 2, label: 'Fair' },
  { value: 1, label: 'Needs Improvement' },
]

// Ratings are stored as the descriptive label (matches the existing `rating text` column).
// This map lets the UI recover the numeric value for display/sorting without a schema change.
const LABEL_TO_VALUE: Record<string, number> = Object.fromEntries(
  RATING_SCALE.map((r) => [r.label, r.value])
)

type DomainType = 'affective' | 'psychomotor'

export default function RatingGrid({ classes, termId }: Props) {
  const supabase = createClient()
  const [groupId, setGroupId] = useState(classes[0]?.id ?? '')
  const [domain, setDomain] = useState<DomainType>('affective')
  const [learners, setLearners] = useState<Learner[]>([])
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(null)
  const [ratings, setRatings] = useState<Record<string, string>>({}) // traitName -> label
  const [loadingLearners, setLoadingLearners] = useState(false)
  const [loadingRatings, setLoadingRatings] = useState(false)
  const [savingTrait, setSavingTrait] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const traits = domain === 'affective' ? AFFECTIVE_TRAITS : PSYCHOMOTOR_TRAITS

  // Load students when class changes
  useEffect(() => {
    if (!groupId) return
    setLoadingLearners(true)
    setSelectedLearnerId(null)
    setError(null)

    supabase
      .from('learners')
      .select('id, first_name, last_name, admission_number')
      .eq('group_id', groupId)
      .eq('is_active', true)
      .order('last_name')
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError('Could not load students for this class.')
          setLearners([])
        } else {
          setLearners(data ?? [])
          if (data && data.length > 0) setSelectedLearnerId(data[0].id)
        }
        setLoadingLearners(false)
      })
  }, [groupId])

  // Load this student's existing ratings for the selected domain + term
  useEffect(() => {
    if (!selectedLearnerId) {
      setRatings({})
      return
    }
    setLoadingRatings(true)
    setError(null)

    fetch(`/api/domain-ratings?learnerId=${selectedLearnerId}&termId=${termId}`)
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, string> = {}
        ;(data.ratings ?? [])
          .filter((r: { domain_type: string }) => r.domain_type === domain)
          .forEach((r: { trait_name: string; rating: string }) => {
            map[r.trait_name] = r.rating
          })
        setRatings(map)
      })
      .catch(() => setError('Could not load existing ratings.'))
      .finally(() => setLoadingRatings(false))
  }, [selectedLearnerId, domain, termId])

  async function saveRating(traitName: string, label: string) {
    if (!selectedLearnerId) return
    setSavingTrait(traitName)
    setError(null)

    const res = await fetch('/api/domain-ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learnerId: selectedLearnerId,
        termId,
        domainType: domain,
        traitName,
        rating: label,
      }),
    })

    const data = await res.json()
    if (data.success) {
      setRatings((prev) => ({ ...prev, [traitName]: label }))
    } else {
      setError(data.error ?? `Failed to save rating for ${traitName}.`)
    }
    setSavingTrait(null)
  }

  const selectedLearner = learners.find((l) => l.id === selectedLearnerId)

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-5 flex items-center gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-ink-muted">Class</label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="border border-surface-200 rounded px-2 py-1.5 text-sm"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-ink-muted">Domain</label>
          <div className="flex gap-1">
            <button
              onClick={() => setDomain('affective')}
              className={`btn-sm btn ${domain === 'affective' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Affective
            </button>
            <button
              onClick={() => setDomain('psychomotor')}
              className={`btn-sm btn ${domain === 'psychomotor' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Psychomotor
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="card p-4 text-sm text-red-600 bg-red-50 border-red-100">{error}</div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-sm text-ink">Students</h2>
          </div>
          {loadingLearners ? (
            <div className="p-8 text-center text-sm text-ink-muted flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading...
            </div>
          ) : learners.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-muted">No students in this class.</div>
          ) : (
            <div className="divide-y divide-surface-100 max-h-[500px] overflow-y-auto">
              {learners.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSelectedLearnerId(l.id)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    selectedLearnerId === l.id
                      ? 'bg-brand-50 text-brand-700 font-medium'
                      : 'hover:bg-surface-50 text-ink'
                  }`}
                >
                  {l.last_name} {l.first_name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 card">
          <div className="card-header">
            <h2 className="font-semibold text-sm text-ink">
              {selectedLearner ? `${selectedLearner.last_name} ${selectedLearner.first_name}` : 'Select a student'}
              {' — '}
              {domain === 'affective' ? 'Affective Domain' : 'Psychomotor Domain'}
            </h2>
          </div>

          {loadingRatings ? (
            <div className="p-8 text-center text-sm text-ink-muted flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading ratings...
            </div>
          ) : !selectedLearnerId ? (
            <div className="p-8 text-center text-sm text-ink-muted">Select a student to begin.</div>
          ) : (
            <div className="divide-y divide-surface-100">
              {traits.map((trait) => (
                <div key={trait} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-sm text-ink">{trait}</span>
                  <div className="flex items-center gap-1">
                    {RATING_SCALE.map((scale) => (
                      <button
                        key={scale.label}
                        onClick={() => saveRating(trait, scale.label)}
                        disabled={savingTrait === trait}
                        title={scale.label}
                        className={`btn-sm btn ${
                          ratings[trait] === scale.label ? 'bg-brand-100 text-brand-700' : 'btn-secondary'
                        }`}
                      >
                        {scale.value}
                      </button>
                    ))}
                    <span className="text-xs text-ink-faint w-24 text-right ml-2">
                      {ratings[trait] ?? '—'}
                    </span>
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
