export interface Reel {
  reel_id: string
  reel_code: string | null
  url: string | null
  username: string | null
  full_name: string | null
  caption: string | null
  like_count: number | null
  view_count: number | null
  comment_count: number | null
  game: string | null
  platform: string | null
  posted_at: string | null
  captured_at: string | null
  created_at: string | null
  linked_clip_id: string | null
  status: string | null
  assigned_to: string | null
  reviewed_at: string | null
  is_approved: boolean | null
  supabase_file_url: string | null
}
