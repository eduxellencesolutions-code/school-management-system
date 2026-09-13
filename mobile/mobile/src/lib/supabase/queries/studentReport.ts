import { supabase } from '../client'
import { loadChildReportCard } from './parentReport'

export async function loadMyReportCard() {
  const { data: learnerId, error } = await supabase.rpc('get_my_learner_id')
  if (error || !learnerId) throw new Error('This login is not linked to a student portal account.')
  return loadChildReportCard(learnerId)
}