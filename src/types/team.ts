export type QaTeamRole = 'qa' | 'qa_manager'

export interface QaTeamUser {
  id: string
  role: QaTeamRole
  display_name: string | null
  email: string
  is_active: boolean
  distribution_enabled: boolean
  created_at: string
  updated_at: string
}
