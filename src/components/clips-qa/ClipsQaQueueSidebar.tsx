import { useEffect, useRef, useState } from 'react'
import type { Reel } from '@/types/reel'
import GameFilterDropdown from '@components/qa/GameFilterDropdown'

function VideoThumbnail({ src, reelId }: { src: string; reelId: string }) {
  const [errored, setErrored] = useState(false)

  if (errored) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-surface-container-highest">
        <span
          className="material-symbols-outlined text-2xl text-on-surface-variant/40"
          style={{ fontVariationSettings: "'FILL' 0" }}
        >
          video_file
        </span>
        <span className="text-[9px] text-on-surface-variant/40">{reelId.slice(0, 8)}</span>
      </div>
    )
  }

  return (
    <video
      src={src}
      className="h-full w-full object-cover opacity-90"
      muted
      playsInline
      preload="metadata"
      onError={() => setErrored(true)}
    />
  )
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
  if (!p) return 'Unknown'
  return PLATFORM_LABELS[p.toLowerCase()] ?? p
}

type Props = {
  reels: Reel[]
  selectedId: string | null
  onSelect: (id: string) => void
  onLogout: () => void
  loading: boolean
  drawerOpen: boolean
  onDrawerClose: () => void
  selectedGame: string | null
  availableGames: string[]
  onGameChange: (game: string | null) => void
}

function SidebarContent({
  reels,
  selectedId,
  onSelect,
  onLogout,
  loading,
  selectedGame,
  availableGames,
  onGameChange,
}: Omit<Props, 'drawerOpen' | 'onDrawerClose'>) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selectedId || !listRef.current) return
    const el = listRef.current.querySelector(`[data-reel-id="${selectedId}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  return (
    <>
      <div className="shrink-0 border-b border-white/5 px-3 py-3">
        <div className="flex items-center gap-2">
          {availableGames.length > 0 ? (
            <GameFilterDropdown
              selectedGame={selectedGame}
              availableGames={availableGames}
              onGameChange={onGameChange}
            />
          ) : (
            <span className="font-headline font-bold text-primary">Queue</span>
          )}
          <span className="ml-auto shrink-0 rounded bg-surface-bright px-2 py-0.5 text-[10px] text-on-surface-variant">
            {loading ? '…' : `${reels.length} Remaining`}
          </span>
        </div>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
        {loading && reels.length === 0 ? (
          <p className="p-4 text-on-surface-variant">Loading queue…</p>
        ) : reels.length === 0 ? (
          <p className="p-4 text-center text-sm text-on-surface-variant">
            {selectedGame ? `No reels for ${selectedGame}` : 'No reels awaiting review'}
          </p>
        ) : (
          reels.map((reel) => {
            const active = reel.reel_id === selectedId
            const platform = platformLabel(reel.platform)
            const likes = formatCount(reel.like_count)
            return (
              <button
                key={reel.reel_id}
                type="button"
                data-reel-id={reel.reel_id}
                onClick={() => onSelect(reel.reel_id)}
                className={`flex w-full gap-3 p-4 text-left transition-all ${
                  active
                    ? 'cursor-pointer border-l-2 border-primary bg-primary/10 text-primary'
                    : 'cursor-pointer border-l-2 border-transparent text-on-surface-variant hover:bg-white/5'
                }`}
              >
                <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-md bg-surface-container-highest">
                  {reel.supabase_file_url ? (
                    <VideoThumbnail src={reel.supabase_file_url} reelId={reel.reel_id} />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-surface-container-highest">
                      <span
                        className="material-symbols-outlined text-2xl text-on-surface-variant/40"
                        style={{ fontVariationSettings: "'FILL' 0" }}
                      >
                        video_file
                      </span>
                      <span className="text-[9px] text-on-surface-variant/40">
                        {reel.reel_id.slice(0, 8)}
                      </span>
                    </div>
                  )}
                  {active ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <span className="material-symbols-outlined text-lg text-primary">
                        play_circle
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="flex min-w-0 flex-col gap-1 py-1">
                  {reel.username ? (
                    <span className="line-clamp-1 text-xs font-semibold text-on-surface">
                      @{reel.username}
                    </span>
                  ) : (
                    <span className="font-label text-[10px] uppercase text-on-surface-variant/60">
                      {reel.reel_id.slice(0, 10)}
                    </span>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {reel.game ? (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                        {reel.game}
                      </span>
                    ) : null}
                    <span className="rounded bg-surface-bright px-1.5 py-0.5 text-[9px] text-on-surface-variant">
                      {platform}
                    </span>
                  </div>
                  {reel.caption ? (
                    <span className="line-clamp-2 text-[11px] text-on-surface-variant">
                      {reel.caption}
                    </span>
                  ) : null}
                  <div className="mt-auto flex items-center gap-1 text-[10px] text-on-surface-variant/60">
                    <span
                      className="material-symbols-outlined text-[12px] text-tertiary/70"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      favorite
                    </span>
                    {likes}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      <footer className="shrink-0 space-y-1 border-t border-white/5 p-4">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-on-surface-variant transition-colors hover:bg-white/5"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          Logout
        </button>
      </footer>
    </>
  )
}

export default function ClipsQaQueueSidebar({
  reels,
  selectedId,
  onSelect,
  onLogout,
  loading,
  drawerOpen,
  onDrawerClose,
  selectedGame,
  availableGames,
  onGameChange,
}: Props) {
  const handleDrawerSelect = (id: string) => {
    onSelect(id)
    onDrawerClose()
  }

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDrawerClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen, onDrawerClose])

  const sharedProps = { reels, selectedId, onLogout, loading, selectedGame, availableGames, onGameChange }

  return (
    <>
      <aside className="hidden h-full w-72 shrink-0 flex-col border-r border-white/5 bg-[#0d0d18] font-body text-sm font-medium sm:w-80 lg:flex">
        <SidebarContent {...sharedProps} onSelect={onSelect} />
      </aside>

      {drawerOpen ? (
        <>
          <button
            type="button"
            aria-label="Close queue"
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={onDrawerClose}
          />
          <aside className="fixed inset-y-0 left-0 z-40 flex w-[min(85vw,20rem)] flex-col border-r border-white/5 bg-[#0d0d18] font-body text-sm font-medium shadow-2xl lg:hidden sm:w-80">
            <SidebarContent {...sharedProps} onSelect={handleDrawerSelect} />
          </aside>
        </>
      ) : null}
    </>
  )
}
