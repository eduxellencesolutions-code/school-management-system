// FILE: src/components/dashboard/TrainingCentreDashboard.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Workflow, BookMarked, Layers, Users, ClipboardList,
  Award, ArrowRight, CheckSquare,
} from 'lucide-react'

interface Props {
  organizationId: string
  userId: string
  isTrainingAdmin: boolean
  userName: string
}

export default async function TrainingCentreDashboard({ organizationId, userId, isTrainingAdmin, userName }: Props) {
  const supabase = await createClient()

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  if (isTrainingAdmin) {
    // ── ORG-WIDE METRICS (Training Admin / centre admin) ──
    const [
      { count: programmesCount },
      { count: modulesCount },
      { count: batchesCount },
      { count: enrolmentsCount },
      { count: pendingSubmissionsCount },
      { data: trainerRows },
      { data: enrolledLearnerRows },
      { data: programmeCompletionRows },
      { data: recentProgrammes },
    ] = await Promise.all([
      supabase.from('training_programmes').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
      supabase.from('training_modules').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
      supabase.from('groups').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('type', 'batch'),
      supabase.from('training_enrolments').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'registered'),
      supabase.from('module_completions').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'trainer_submitted'),
      supabase.from('training_modules').select('trainer_id').eq('organization_id', organizationId).not('trainer_id', 'is', null),
      supabase.from('training_enrolments').select('learner_id').eq('organization_id', organizationId).eq('status', 'registered'),
      supabase.from('programme_completions').select('status').eq('organization_id', organizationId),
      supabase.from('training_programmes')
        .select('id, name, code, is_active, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    // Distinct counts computed client-side — Supabase's count:'exact' counts
    // rows, not distinct values, so trainer/learner headcounts need dedup here.
    const trainersCount = new Set((trainerRows ?? []).map(r => r.trainer_id)).size
    const learnersCount = new Set((enrolledLearnerRows ?? []).map(r => r.learner_id)).size
    const completedProgrammesCount = (programmeCompletionRows ?? []).filter(r => r.status === 'completed').length
    const inProgressProgrammesCount = (programmeCompletionRows ?? []).filter(r => r.status === 'in_progress').length

    // Per-programme module/batch/learner counts, for the recent-programmes list
    const programmeIds = (recentProgrammes ?? []).map(p => p.id)
    let moduleCountByProgramme = new Map<string, number>()
    let learnerCountByProgramme = new Map<string, number>()
    if (programmeIds.length > 0) {
      const { data: modulesForProgrammes } = await supabase
        .from('training_modules').select('training_programme_id').in('training_programme_id', programmeIds)
      ;(modulesForProgrammes ?? []).forEach(m => {
        moduleCountByProgramme.set(m.training_programme_id, (moduleCountByProgramme.get(m.training_programme_id) ?? 0) + 1)
      })

      const { data: enrolmentsForProgrammes } = await supabase
        .from('training_enrolments').select('training_programme_id, learner_id').in('training_programme_id', programmeIds).eq('status', 'registered')
      const seen = new Map<string, Set<string>>()
      ;(enrolmentsForProgrammes ?? []).forEach(e => {
        if (!seen.has(e.training_programme_id)) seen.set(e.training_programme_id, new Set())
        seen.get(e.training_programme_id)!.add(e.learner_id)
      })
      seen.forEach((set, pid) => learnerCountByProgramme.set(pid, set.size))
    }

    const stats = [
      { label: 'Programmes', value: programmesCount ?? 0, icon: Workflow, href: '/training/programmes', color: 'text-brand-500', bg: 'bg-brand-50' },
      { label: 'Modules', value: modulesCount ?? 0, icon: BookMarked, href: '/training/modules', color: 'text-green-600', bg: 'bg-green-50' },
      { label: 'Batches', value: batchesCount ?? 0, icon: Layers, href: '/training/batches', color: 'text-amber-600', bg: 'bg-amber-50' },
      { label: 'Trainers', value: trainersCount, icon: Users, href: '/training/modules', color: 'text-purple-600', bg: 'bg-purple-50' },
      { label: 'Learners', value: learnersCount, icon: Users, href: '/training/enrolments', color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'Enrolments', value: enrolmentsCount ?? 0, icon: ClipboardList, href: '/training/enrolments', color: 'text-indigo-600', bg: 'bg-indigo-50' },
      { label: 'Awaiting confirmation', value: pendingSubmissionsCount ?? 0, icon: CheckSquare, href: '/training/completions', color: 'text-orange-600', bg: 'bg-orange-50' },
      { label: 'Programmes completed', value: completedProgrammesCount, icon: Award, href: '/training/programmes', color: 'text-teal-600', bg: 'bg-teal-50' },
    ]

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="page-title">{greeting}, {userName.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Training Admin • Here's what's happening at your centre today.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, href, color, bg }) => (
            <Link key={label} href={href} className="stat-card hover:shadow-md transition-shadow group">
              <div className={`w-9 h-9 rounded ${bg} flex items-center justify-center mb-2`}>
                <Icon size={18} className={color} />
              </div>
              <div className="stat-value">{value.toLocaleString()}</div>
              <div className="stat-label">{label}</div>
              <div className="flex items-center gap-1 text-xs text-ink-faint mt-1 group-hover:text-brand-500 transition-colors">
                View all <ArrowRight size={10} />
              </div>
            </Link>
          ))}
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-sm text-ink">Recent Programmes</h2>
            <Link href="/training/programmes" className="text-xs text-brand-500 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-surface-200">
            {recentProgrammes && recentProgrammes.length > 0 ? (
              recentProgrammes.map(p => (
                <div key={p.id} className="px-5 py-3 flex items-center justify-between hover:bg-surface-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-brand-50 text-brand-600 text-xs font-bold flex items-center justify-center">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">{p.name}</p>
                      <p className="text-xs text-ink-muted">
                        {moduleCountByProgramme.get(p.id) ?? 0} module{(moduleCountByProgramme.get(p.id) ?? 0) !== 1 ? 's' : ''} · {learnerCountByProgramme.get(p.id) ?? 0} learner{(learnerCountByProgramme.get(p.id) ?? 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <Link href={`/training/modules?programme_id=${p.id}`} className="btn-secondary btn-sm btn">View modules</Link>
                </div>
              ))
            ) : (
              <div className="px-5 py-10 text-center">
                <Workflow size={32} className="text-surface-200 mx-auto mb-3" />
                <p className="text-sm text-ink-muted mb-3">No training programmes yet.</p>
                <Link href="/training/programmes/new" className="btn-primary btn-sm btn">Create your first programme</Link>
              </div>
            )}
          </div>
        </div>

        {pendingSubmissionsCount !== null && pendingSubmissionsCount > 0 && (
          <div className="card p-5 bg-orange-50 border-orange-200">
            <p className="text-sm text-orange-800">
              <strong>{pendingSubmissionsCount}</strong> module submission{pendingSubmissionsCount !== 1 ? 's are' : ' is'} awaiting your confirmation.{' '}
              <Link href="/training/completions" className="underline font-medium">Review now →</Link>
            </p>
          </div>
        )}
      </div>
    )
  }

  // ── TRAINER'S OWN DASHBOARD (non-admin, own assignments only) ──
  // RLS already scopes training_modules/module_completions to trainer_id =
  // auth.uid() — the .eq() filters here are explicit defense-in-depth, not
  // the actual security boundary.
  const { data: assignedModules } = await supabase
    .from('training_modules')
    .select('id, name, sequence, training_programme_id, training_programmes(name)')
    .eq('trainer_id', userId)
    .order('name')

  const moduleIds = (assignedModules ?? []).map(m => m.id)
  const programmeIds = [...new Set((assignedModules ?? []).map(m => m.training_programme_id))]

  let completionsByModule = new Map<string, { draft: number; trainer_submitted: number; confirmed: number }>()
  let learnersByProgramme = new Map<string, number>()
  let batchesByProgramme = new Map<string, Set<string>>()

  if (moduleIds.length > 0) {
    const { data: completions } = await supabase
      .from('module_completions')
      .select('training_module_id, status')
      .in('training_module_id', moduleIds)
    // RLS already restricts these rows to modules this trainer owns —
    // this .in() is scoping which modules to summarize, not a security check.
    ;(completions ?? []).forEach(c => {
      const entry = completionsByModule.get(c.training_module_id) ?? { draft: 0, trainer_submitted: 0, confirmed: 0 }
      entry[c.status as 'draft' | 'trainer_submitted' | 'confirmed'] += 1
      completionsByModule.set(c.training_module_id, entry)
    })
  }

  if (programmeIds.length > 0) {
    const { data: enrolments } = await supabase
      .from('training_enrolments')
      .select('training_programme_id, learner_id, batch_group_id')
      .in('training_programme_id', programmeIds)
      .eq('status', 'registered')

    const learnerSets = new Map<string, Set<string>>()
    ;(enrolments ?? []).forEach(e => {
      if (!learnerSets.has(e.training_programme_id)) learnerSets.set(e.training_programme_id, new Set())
      learnerSets.get(e.training_programme_id)!.add(e.learner_id)
      if (!batchesByProgramme.has(e.training_programme_id)) batchesByProgramme.set(e.training_programme_id, new Set())
      batchesByProgramme.get(e.training_programme_id)!.add(e.batch_group_id)
    })
    learnerSets.forEach((set, pid) => learnersByProgramme.set(pid, set.size))
  }

  const totalLearners = [...learnersByProgramme.values()].reduce((sum, n) => sum + n, 0)
  const totalPendingSubmission = [...completionsByModule.values()].reduce((sum, c) => sum + c.trainer_submitted, 0)
  const totalDraft = [...completionsByModule.values()].reduce((sum, c) => sum + c.draft, 0)
  const totalConfirmed = [...completionsByModule.values()].reduce((sum, c) => sum + c.confirmed, 0)

  const stats = [
    { label: 'Assigned Modules', value: assignedModules?.length ?? 0, icon: BookMarked, color: 'text-brand-500', bg: 'bg-brand-50' },
    { label: 'Learners', value: totalLearners, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Awaiting confirmation', value: totalPendingSubmission, icon: CheckSquare, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Confirmed', value: totalConfirmed, icon: Award, color: 'text-teal-600', bg: 'bg-teal-50' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">{greeting}, {userName.split(' ')[0]} 👋</h1>
        <p className="page-subtitle">Trainer • Here's the status of your assigned modules.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div className={`w-9 h-9 rounded ${bg} flex items-center justify-center mb-2`}>
              <Icon size={18} className={color} />
            </div>
            <div className="stat-value">{value.toLocaleString()}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="font-semibold text-sm text-ink">My Modules</h2>
          <Link href="/training/my-modules" className="text-xs text-brand-500 hover:underline">View all</Link>
        </div>
        <div className="divide-y divide-surface-200">
          {assignedModules && assignedModules.length > 0 ? (
            assignedModules.map((m: any) => {
              const completion = completionsByModule.get(m.id) ?? { draft: 0, trainer_submitted: 0, confirmed: 0 }
              const batchCount = batchesByProgramme.get(m.training_programme_id)?.size ?? 0
              const learnerCount = learnersByProgramme.get(m.training_programme_id) ?? 0
              return (
                <div key={m.id} className="px-5 py-3 flex items-center justify-between hover:bg-surface-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-green-50 text-green-600 text-xs font-bold flex items-center justify-center">
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">{m.name}</p>
                      <p className="text-xs text-ink-muted">
                        {m.training_programmes?.name} · {batchCount} batch{batchCount !== 1 ? 'es' : ''} · {learnerCount} learner{learnerCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {completion.trainer_submitted > 0 && (
                      <span className="badge badge-blue text-[10px]">{completion.trainer_submitted} pending review</span>
                    )}
                    {completion.confirmed > 0 && (
                      <span className="badge badge-gray text-[10px]">{completion.confirmed} confirmed</span>
                    )}
                    <Link href={`/training/my-modules?module=${m.id}`} className="btn-primary btn-sm btn">Enter scores</Link>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="px-5 py-10 text-center">
              <BookMarked size={32} className="text-surface-200 mx-auto mb-3" />
              <p className="text-sm text-ink-muted">No modules assigned to you yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}