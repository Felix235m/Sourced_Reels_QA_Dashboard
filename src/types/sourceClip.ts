export interface SourceClip {
  id: string
  game: string | null
  source_platform: string | null
  source_url: string | null
  source_public_url: string | null
  clip_duration: string | null
  mojo_fit_score: number | null
  mojo_fit_verdict: string | null
  source_age_hours_at_qualify: string | null
  source_rank_score: number | null
  source_velocity_score: number | null
  source_validation_score: number | null
  status: string | null
  created_at: string | null
}
