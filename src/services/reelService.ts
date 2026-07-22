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

/** IANA zone for CET/CEST — used to define the QA team's business "day" for daily targets. */
const BUSINESS_TIME_ZONE = 'Europe/Berlin'

/** ISO UTC instant corresponding to local midnight in `timeZone` for the given reference instant. */
function startOfDayIso(timeZone: string, reference: Date): string {
  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(reference)
  const dateField = (type: string) => Number(dateParts.find((p) => p.type === type)?.value)
  const naiveUtcMidnight = Date.UTC(dateField('year'), dateField('month') - 1, dateField('day'))

  const clockParts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(reference)
  const clockField = (type: string) => Number(clockParts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(
    clockField('year'),
    clockField('month') - 1,
    clockField('day'),
    clockField('hour'),
    clockField('minute'),
    clockField('second'),
  )
  const offsetMinutes = (asUtc - reference.getTime()) / 60000

  return new Date(naiveUtcMidnight - offsetMinutes * 60000).toISOString()
}

async function getUser() {
  const supabase = requireSupabase()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) throw new Error('Not signed in')
  return { supabase, user }
}

/** Which slice of reels to show: the live validated queue, or recently-rejected reels. */
export type ReelView = 'validated' | 'rejected'

/** How far back the rejected view looks (by reviewed_at). */
const REJECTED_WINDOW_MS = 48 * 60 * 60 * 1000

/** ISO timestamp cutoff for the rejected view (now - 48h). */
function rejectedCutoffIso(): string {
  return new Date(Date.now() - REJECTED_WINDOW_MS).toISOString()
}

/**
 * Reels visible to the signed-in reviewer, optionally filtered by game.
 * - view 'validated' → the live validated queue (default).
 * - view 'rejected'  → reels rejected in the last 48h (supervisor/qa role only).
 * For the all-access qa role, results span all reviewers; otherwise just the caller's.
 */
export async function fetchReelsQueue(
  game?: string | null,
  allAccess = false,
  view: ReelView = 'validated',
): Promise<Reel[]> {
  const { supabase, user } = await getUser()

  let query = supabase.from('reels').select(REEL_SELECT)
  if (view === 'rejected') {
    // Only rejected reels that still have a playable file — nothing to show otherwise.
    query = query
      .eq('status', 'rejected')
      .gte('reviewed_at', rejectedCutoffIso())
      .not('supabase_file_url', 'is', null)
      .order('reviewed_at', { ascending: false })
  } else {
    query = query
      .eq('status', 'validated')
      .order('created_at', { ascending: true, nullsFirst: true })
      .order('reel_id', { ascending: true })
  }
  if (!allAccess) query = query.eq('assigned_to', user.id)
  if (game) query = query.eq('game', game)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as Reel[]
  // Guard against empty-string file urls the DB null-filter won't catch.
  return view === 'rejected' ? rows.filter((r) => r.supabase_file_url) : rows
}

/** Count of reels approved so far today (CET/CEST business day), scoped to a game. */
export async function getApprovedTodayCount(
  game: string,
  allAccess = false,
): Promise<number> {
  const { supabase, user } = await getUser()
  const startOfDay = startOfDayIso(BUSINESS_TIME_ZONE, new Date())

  let query = supabase
    .from('reels')
    .select('reel_id', { count: 'exact', head: true })
    .eq('game', game)
    .eq('is_approved', true)
    .gte('reviewed_at', startOfDay)
  if (!allAccess) query = query.eq('assigned_to', user.id)

  const { count, error } = await query
  if (error) throw new Error(error.message)
  return count ?? 0
}

/**
 * Count of validated reels (the live "in queue" total) visible to the caller,
 * optionally scoped to a game. Always counts the validated queue regardless of
 * which view the UI is showing.
 */
export async function getInQueueCount(
  game: string | null,
  allAccess = false,
): Promise<number> {
  const { supabase, user } = await getUser()
  let query = supabase
    .from('reels')
    .select('reel_id', { count: 'exact', head: true })
    .eq('status', 'validated')
  if (!allAccess) query = query.eq('assigned_to', user.id)
  if (game) query = query.eq('game', game)

  const { count, error } = await query
  if (error) throw new Error(error.message)
  return count ?? 0
}

/** Distinct games among the reels visible to the signed-in reviewer, for the given view. */
export async function fetchReelGames(
  allAccess = false,
  view: ReelView = 'validated',
): Promise<string[]> {
  const { supabase, user } = await getUser()

  let query = supabase.from('reels').select('game').not('game', 'is', null)
  if (view === 'rejected') {
    query = query.eq('status', 'rejected').gte('reviewed_at', rejectedCutoffIso())
  } else {
    query = query.eq('status', 'validated')
  }
  if (!allAccess) query = query.eq('assigned_to', user.id)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return Array.from(new Set((data ?? []).map((r) => r.game as string))).sort()
}

/**
 * Game the caller most recently reviewed today (CET/CEST business day), or null
 * if nothing has been reviewed today. Used as a fallback so the daily-target
 * badge still reflects real progress once a game's pending queue is fully cleared
 * (at which point it drops out of `fetchReelGames`'s validated-only result).
 */
export async function fetchMostRecentlyReviewedGame(allAccess = false): Promise<string | null> {
  const { supabase, user } = await getUser()
  const startOfDay = startOfDayIso(BUSINESS_TIME_ZONE, new Date())

  let query = supabase
    .from('reels')
    .select('game')
    .not('game', 'is', null)
    .gte('reviewed_at', startOfDay)
    .order('reviewed_at', { ascending: false })
    .limit(1)
  if (!allAccess) query = query.eq('assigned_to', user.id)

  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(error.message)
  return (data?.game as string | undefined) ?? null
}

/**
 * Approve or reject a reel.
 * - approve → status='approved', is_approved=true, reviewed_at=now
 * - reject  → status='rejected', is_approved=false, reviewed_at=now
 */
export async function submitReelDecision(
  reelId: string,
  decision: 'approve' | 'reject',
  allAccess = false,
): Promise<void> {
  const { supabase, user } = await getUser()
  const now = new Date().toISOString()

  let query = supabase
    .from('reels')
    .update({
      status: decision === 'approve' ? 'approved' : 'rejected',
      is_approved: decision === 'approve',
      reviewed_at: now,
    })
    .eq('reel_id', reelId)
    .eq('status', 'validated')
  if (!allAccess) query = query.eq('assigned_to', user.id)

  const { data, error } = await query.select('reel_id').maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) {
    throw new Error(
      'Could not update reel (it may have already been reviewed, or you lack permission).',
    )
  }
}
