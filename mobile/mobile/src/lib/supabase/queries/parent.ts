import { supabase } from '../client'

export interface LinkedChild {
  id: string; firstName: string; lastName: string; admissionNumber: string | null; className: string | null
}

export async function loadLinkedChildren(): Promise<LinkedChild[]> {
  const { data: linkedIds, error: idsError } = await supabase.rpc('get_my_linked_learner_ids')
  if (idsError) throw new Error('Could not load your linked children.')

  const ids = (linkedIds ?? []).map((r: any) => r.get_my_linked_learner_ids ?? r)
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('learners')
    .select('id, first_name, last_name, admission_number, group:groups(name)')
    .in('id', ids)

  if (error) throw new Error('Could not load your children\'s details.')

  return (data ?? []).map((l: any) => ({
    id: l.id, firstName: l.first_name, lastName: l.last_name,
    admissionNumber: l.admission_number, className: l.group?.name ?? null,
  }))
}