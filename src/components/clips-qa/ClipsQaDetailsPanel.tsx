import type { Reel } from '@/types/reel'

type Props = {
  reel: Reel | null
  durationSec: number | null
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return '—'
  }
}

function formatCount(n: number | null): string {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: 'TikTok',
  twitch: 'Twitch',
  youtube: 'YouTube',
  instagram: 'Instagram',
  twitter: 'Twitter',
  x: 'X',
}

function platformLabel(p: string | null): string {
  if (!p) return '—'
  return PLATFORM_LABELS[p.toLowerCase()] ?? p
}

/** Human label + text color for a reel's raw status value. */
function statusDisplay(status: string | null): { label: string; className: string } {
  switch ((status ?? '').toLowerCase()) {
    case 'validated':
      return { label: 'Validated', className: 'text-secondary' }
    case 'approved':
      return { label: 'Approved', className: 'text-secondary' }
    case 'rejected':
      return { label: 'Rejected', className: 'text-error' }
    case '':
      return { label: '—', className: 'text-on-surface' }
    default:
      return { label: status as string, className: 'text-on-surface' }
  }
}

export default function ClipsQaDetailsPanel({ reel, durationSec }: Props) {
  const durationDisplay =
    durationSec != null && Number.isFinite(durationSec) ? `${Math.round(durationSec)}s` : '—'

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-l border-white/5 bg-surface-container lg:flex lg:w-80">
      <div className="min-h-0 flex-1 space-y-8 overflow-y-auto p-6">

        <section>
          <h3 className="mb-4 font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
            Creator
          </h3>
          <div className="space-y-3">
            {reel?.username ? (
              <div className="flex flex-col">
                <span className="text-xs text-on-surface-variant/60">Username</span>
                <span className="font-semibold text-primary">@{reel.username}</span>
              </div>
            ) : null}
            {reel?.full_name ? (
              <div className="flex flex-col">
                <span className="text-xs text-on-surface-variant/60">Full name</span>
                <span className="text-sm font-semibold text-on-surface">{reel.full_name}</span>
              </div>
            ) : null}
          </div>
        </section>

        <section>
          <h3 className="mb-4 font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
            Engagement
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center rounded-lg border border-white/5 bg-surface-container-high p-3">
              <span
                className="material-symbols-outlined text-lg text-tertiary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                favorite
              </span>
              <span className="mt-1 text-sm font-bold text-on-surface">
                {formatCount(reel?.like_count ?? null)}
              </span>
              <span className="text-[9px] text-on-surface-variant/60">Likes</span>
            </div>
            <div className="flex flex-col items-center rounded-lg border border-white/5 bg-surface-container-high p-3">
              <span
                className="material-symbols-outlined text-lg text-primary"
                style={{ fontVariationSettings: "'FILL' 0" }}
              >
                play_circle
              </span>
              <span className="mt-1 text-sm font-bold text-on-surface">
                {formatCount(reel?.view_count ?? null)}
              </span>
              <span className="text-[9px] text-on-surface-variant/60">Views</span>
            </div>
            <div className="flex flex-col items-center rounded-lg border border-white/5 bg-surface-container-high p-3">
              <span
                className="material-symbols-outlined text-lg text-secondary"
                style={{ fontVariationSettings: "'FILL' 0" }}
              >
                chat_bubble
              </span>
              <span className="mt-1 text-sm font-bold text-on-surface">
                {formatCount(reel?.comment_count ?? null)}
              </span>
              <span className="text-[9px] text-on-surface-variant/60">Comments</span>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-4 font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
            Reel info
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-on-surface-variant/60">Game</span>
                <span className="font-semibold text-primary">{reel?.game ?? '—'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-on-surface-variant/60">Platform</span>
                <span className="font-semibold text-on-surface">
                  {platformLabel(reel?.platform ?? null)}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-on-surface-variant/60">Duration</span>
                <span className="font-semibold text-on-surface">{durationDisplay}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-on-surface-variant/60">Status</span>
                <span className={`font-semibold ${statusDisplay(reel?.status ?? null).className}`}>
                  {statusDisplay(reel?.status ?? null).label}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-on-surface-variant/60">Posted</span>
                <span className="text-xs font-semibold text-on-surface">
                  {formatTime(reel?.posted_at ?? null)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-on-surface-variant/60">Captured</span>
                <span className="text-xs font-semibold text-on-surface">
                  {formatTime(reel?.captured_at ?? null)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {reel?.caption ? (
          <section>
            <h3 className="mb-3 font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
              Caption
            </h3>
            <p className="text-xs leading-relaxed text-on-surface-variant">{reel.caption}</p>
          </section>
        ) : null}

        <section>
          <h3 className="mb-3 font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
            Original post
          </h3>
          {reel?.url ? (
            <a
              href={reel.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-start gap-1.5 text-xs text-primary transition-opacity hover:opacity-80"
            >
              <span className="material-symbols-outlined shrink-0 text-sm">open_in_new</span>
              <span className="line-clamp-2 break-all">{reel.url}</span>
            </a>
          ) : (
            <span className="text-xs text-on-surface-variant/60">No URL</span>
          )}
        </section>
      </div>
    </aside>
  )
}
