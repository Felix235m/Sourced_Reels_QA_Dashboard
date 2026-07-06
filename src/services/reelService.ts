import { requireSupabase } from '@services/supabaseClient'
import type { Reel } from '@/types/reel'

const REEL_SELECT = [
  'reel_id',
  'reel_code',
  'url',
  'username',
  'full_name',
  'caption',
  'like_count',
  'view_count',
  'comment_count',
  'game',
  'platform',
  'posted_at',
  'captured_at',
  'created_at',
  'linked_clip_id',
  'status',
  'assigned_to',
  'reviewed_at',
  'is_approved',
  'supabase_file_url',
].join(',')

async function getUser() {
  const supabase = requireSupabase()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error('Not signed in')
  return { supabase, user }
}

/** Validated reels assigned to the signed-in reviewer, optionally filtered by game. */
export async function fetchReelsQueue(game?: string | null): Promise<Reel[]> {
  const { supabase, user } = await getUser()

  let query = supabase
    .from('reels')
    .select(REEL_SELECT)
    .eq('assigned_to', user.id)
    .eq('status', 'validated')
    .order('created_at', { ascending: true, nullsFirst: true })
    .order('reel_id', { ascending: true })
  if (game) query = query.eq('game', game)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as Reel[]
}

/** Count of reels the signed-in reviewer has approved so far today (UTC calendar day), scoped to a game. */
export async function getApprovedTodayCount(game: string): Promise<number> {
  const { supabase, user } = await getUser()
  const now = new Date()
  const startOfDayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString()

  const { count, error } = await supabase
    .from('reels')
    .select('reel_id', { count: 'exact', head: true })
    .eq('assigned_to', user.id)
    .eq('game', game)
    .eq('is_approved', true)
    .gte('reviewed_at', startOfDayUtc)

  if (error) throw new Error(error.message)
  return count ?? 0
}

/** Distinct games in the signed-in reviewer's validated reels. */
export async function fetchReelGames(): Promise<string[]> {
  const { supabase, user } = await getUser()

  const { data, error } = await supabase
    .from('reels')
    .select('game')
    .eq('assigned_to', user.id)
    .eq('status', 'validated')
    .not('game', 'is', null)
  if (error) throw new Error(error.message)
  return Array.from(new Set((data ?? []).map((r) => r.game as string))).sort()
}

/**
 * Approve or reject a reel.
 * - approve → status='approved', is_approved=true, reviewed_at=now
 * - reject  → status='rejected', is_approved=false, reviewed_at=now
 */
export async function submitReelDecision(
  reelId: string,
  decision: 'approve' | 'reject',
): Promise<void> {
  const { supabase, user } = await getUser()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('reels')
    .update({
      status: decision === 'approve' ? 'approved' : 'rejected',
      is_approved: decision === 'approve',
      reviewed_at: now,
    })
    .eq('reel_id', reelId)
    .eq('assigned_to', user.id)
    .eq('status', 'validated')
    .select('reel_id')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) {
    throw new Error(
      'Could not update reel (it may have already been reviewed, or you lack permission).',
    )
  }
}
