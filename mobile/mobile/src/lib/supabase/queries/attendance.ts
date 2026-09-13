import { supabase } from '../client'

export interface RosterEntry {
  learnerId: string
  firstName: string
  lastName: string
  admissionNumber: string | null
  status: 'present' | 'absent' | 'late' | null
  recordId: string | null
}

export async function loadClassRosterForDate(
  groupId: string,
  date: string // 'YYYY-MM-DD'
): Promise<RosterEntry[]> {
  const { data: learners, error: learnersError } = await supabase
    .from('learners')
    .select('id, first_name, last_name, admission_number')
    .eq('group_id', groupId)
    .eq('is_active', true)
    .order('last_name')

  if (learnersError) throw new Error('Could not load the class roster.')

  const { data: existing, error: attendanceError } = await supabase
    .from('attendance_records')
    .select('id, learner_id, status')
    .eq('group_id', groupId)
    .eq('date', date)

  if (attendanceError) throw new Error('Could not load existing attendance for this date.')

  const existingByLearner = new Map((existing ?? []).map((r) => [r.learner_id, r]))

  return (learners ?? []).map((l) => {
    const record = existingByLearner.get(l.id)
    return {
      learnerId: l.id,
      firstName: l.first_name,
      lastName: l.last_name,
      admissionNumber: l.admission_number,
      status: (record?.status as RosterEntry['status']) ?? null,
      recordId: record?.id ?? null,
    }
  })
}

export async function submitAttendance(params: {
  organizationId: string
  groupId: string
  termId: string
  sessionId: string
  date: string
  entries: { learnerId: string; status: 'present' | 'absent' | 'late' }[]
}): Promise<void> {
  const rows = params.entries.map((e) => ({
    organization_id: params.organizationId,
    group_id: params.groupId,
    learner_id: e.learnerId,
    term_id: params.termId,
    session_id: params.sessionId,
    date: params.date,
    status: e.status,
  }))

  // Upsert on the natural key so re-marking the same day updates rather
  // than duplicates. Requires a unique constraint on
  // (group_id, learner_id, date) — see note below if this errors.
  const { error } = await supabase
    .from('attendance_records')
    .upsert(rows, { onConflict: 'group_id,learner_id,date' })

  if (error) throw new Error('Could not save attendance. Please try again.')
}

export interface AttendanceAlerts {
  consecutive5plus: { learnerId: string; firstName: string; lastName: string; className: string | null; consecutiveDays: number }[]
  repeated2Weeks: { learnerId: string; firstName: string; lastName: string; className: string | null; absencesLast14Days: number }[]
  below80Percent: { learnerId: string; firstName: string; lastName: string; className: string | null; attendancePercentage: number }[]
}

export async function loadAttendanceAlerts(orgId: string): Promise<AttendanceAlerts> {
  const { data, error } = await supabase.rpc('get_attendance_alerts', { p_org_id: orgId })
  if (error) throw new Error('Could not load attendance alerts.')

  return {
    consecutive5plus: (data.consecutive_5plus ?? []).map((r: any) => ({
      learnerId: r.learner_id, firstName: r.first_name, lastName: r.last_name,
      className: r.class_name, consecutiveDays: r.consecutive_days,
    })),
    repeated2Weeks: (data.repeated_2weeks ?? []).map((r: any) => ({
      learnerId: r.learner_id, firstName: r.first_name, lastName: r.last_name,
      className: r.class_name, absencesLast14Days: r.absences_last_14_days,
    })),
    below80Percent: (data.below_80_percent ?? []).map((r: any) => ({
      learnerId: r.learner_id, firstName: r.first_name, lastName: r.last_name,
      className: r.class_name, attendancePercentage: r.attendance_percentage,
    })),
  }
}