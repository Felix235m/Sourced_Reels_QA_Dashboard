import { requireSupabase } from '@services/supabaseClient'
import type { QaTeamUser } from '@/types/team'

export async function fetchMyTeamRow(userId: string): Promise<QaTeamUser | null> {
  const sb = requireSupabase()
  const { data, error } = await sb
    .from('qa_team_users')
    .select(
      'id,role,display_name,email,is_active,distribution_enabled,created_at,updated_at',
    )
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  return data as QaTeamUser | null
}
