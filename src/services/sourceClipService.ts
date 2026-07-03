import { requireSupabase } from '@services/supabaseClient'
import type { SourceClip } from '@/types/sourceClip'

const SOURCE_SELECT = [
  'id',
  'game',
  'source_platform',
  'source_url',
  'source_public_url',
  'clip_duration',
  'mojo_fit_score',
  'mojo_fit_verdict',
  'source_age_hours_at_qualify',
  'source_rank_score',
  'source_velocity_score',
  'source_validation_score',
  'status',
  'created_at',
].join(',')

/** Source clips assigned to the signed-in reviewer with status 'feed', optionally filtered by game. */
export async function fetchSourceClipsQueue(game?: string | null): Promise<SourceClip[]> {
  const supabase = requireSupabase()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error('Not signed in')

  let query = supabase
    .from('clips')
    .select(SOURCE_SELECT)
    .eq('qa_assigned_to', user.id)
    .eq('status', 'feed')
    .order('qa_assigned_at', { ascending: true, nullsFirst: true })
    .order('id', { ascending: true })
  if (game) query = query.eq('game', game)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as SourceClip[]
}

/** Distinct games the signed-in reviewer has feed-status clips in, sorted alphabetically. */
export async function fetchAssignedGamesForFeed(): Promise<string[]> {
  const supabase = requireSupabase()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('clips')
    .select('game')
    .eq('qa_assigned_to', user.id)
    .eq('status', 'feed')
    .not('game', 'is', null)
  if (error) throw new Error(error.message)
  return Array.from(new Set((data ?? []).map((r) => r.game as string))).sort()
}

export async function submitSourceClipDecision(
  clipId: string,
  decision: 'approve' | 'reject',
): Promise<void> {
  const supabase = requireSupabase()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error('Not signed in')

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('clips')
    .update({
      status: decision === 'approve' ? 'sourced' : 'rejected',
      qa_reviewed_by: user.id,
      qa_reviewed_at: now,
    })
    .eq('id', clipId)
    .eq('status', 'feed')
    .select('id')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) {
    throw new Error(
      'Could not update clip (it may have been reviewed already, or your account lacks permission to update this row).',
    )
  }
}
