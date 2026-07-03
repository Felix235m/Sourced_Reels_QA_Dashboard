import { requireSupabase } from '@services/supabaseClient'
import type { QaClip } from '@/types/qaClip'

const QA_SELECT =
  'id,best_title,ig_description,tag,status,composed_video_url,created_at,game'

/** Clips assigned to the signed-in reviewer, optionally filtered by game. */
export async function fetchQaQueue(game?: string | null): Promise<QaClip[]> {
  const supabase = requireSupabase()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) {
    throw new Error('Not signed in')
  }
  let query = supabase
    .from('clips')
    .select(QA_SELECT)
    .eq('qa_assigned_to', user.id)
    .in('status', ['assigned', 'pending_qa', 'ready_qa'])
    .order('qa_assigned_at', { ascending: true, nullsFirst: true })
    .order('id', { ascending: true })
  if (game) query = query.eq('game', game)

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }
  return (data ?? []) as QaClip[]
}

/** Distinct games the signed-in reviewer has assigned clips in, sorted alphabetically. */
export async function fetchAssignedGames(): Promise<string[]> {
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
    .in('status', ['assigned', 'pending_qa', 'ready_qa'])
    .not('game', 'is', null)
  if (error) throw new Error(error.message)
  return Array.from(new Set((data ?? []).map((r) => r.game as string))).sort()
}

export async function submitQaDecision(
  clipId: string,
  decision: 'approved' | 'rejected' | 'vision_training',
): Promise<void> {
  const supabase = requireSupabase()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) {
    throw new Error('Not signed in')
  }
  const now = new Date().toISOString()
  const approved = decision === 'approved'
  const { data, error } = await supabase
    .from('clips')
    .update({
      status: decision,
      approved,
      qa_reviewed_by: user.id,
      qa_reviewed_at: now,
    })
    .eq('id', clipId)
    .in('status', ['assigned', 'pending_qa', 'ready_qa'])
    .select('id')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  if (!data) {
    throw new Error(
      'Could not update clip (it may have been reviewed already, or your account lacks permission to update this row).',
    )
  }
}

export async function updateClipBestTitle(
  clipId: string,
  bestTitle: string | null,
): Promise<void> {
  const supabase = requireSupabase()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) {
    throw new Error('Not signed in')
  }
  const value = bestTitle?.trim() ? bestTitle.trim() : null
  const { data, error } = await supabase
    .from('clips')
    .update({ best_title: value })
    .eq('id', clipId)
    .eq('qa_assigned_to', user.id)
    .in('status', ['assigned', 'pending_qa', 'ready_qa'])
    .select('id')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  if (!data) {
    throw new Error('Could not save title.')
  }
}
