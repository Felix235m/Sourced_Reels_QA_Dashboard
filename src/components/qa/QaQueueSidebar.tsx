import { useEffect, useRef, useState } from 'react'
import type { QaClip } from '@/types/qaClip'
import GameFilterDropdown from '@components/qa/GameFilterDropdown'

/** Video thumbnail with a fallback placeholder on load error (handles iOS preload restrictions). */
function VideoThumbnail({ src, clipId }: { src: string; clipId: string }) {
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
        <span className="text-[9px] text-on-surface-variant/40">#{clipId.slice(0, 6)}</span>
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

type Props = {
  clips: QaClip[]
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

function QueueSidebarContent({
  clips,
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
    const el = listRef.current.querySelector(`[data-clip-id="${selectedId}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  return (
    <>
      {/* Header: game filter + count */}
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
            {loading ? '…' : `${clips.length} Remaining`}
          </span>
        </div>
      </div>

      {/* Clip list */}
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
        {loading && clips.length === 0 ? (
          <p className="p-4 text-on-surface-variant">Loading queue…</p>
        ) : clips.length === 0 ? (
          <p className="p-4 text-center text-sm text-on-surface-variant">
            {selectedGame ? `No clips for ${selectedGame}` : 'No clips awaiting QA'}
          </p>
        ) : (
          clips.map((clip) => {
            const active = clip.id === selectedId
            const title = clip.best_title ?? 'Untitled'
            const desc = clip.ig_description ?? ''
            return (
              <button
                key={clip.id}
                type="button"
                data-clip-id={clip.id}
                onClick={() => onSelect(clip.id)}
                className={`flex w-full gap-3 p-4 text-left transition-all ${
                  active
                    ? 'cursor-pointer border-l-2 border-primary bg-primary/10 text-primary'
                    : 'cursor-pointer border-l-2 border-transparent text-on-surface-variant hover:bg-white/5'
                }`}
              >
                <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-md bg-surface-container-highest">
                  {clip.composed_video_url ? (
                    <VideoThumbnail src={clip.composed_video_url} clipId={clip.id} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-on-surface-variant">
                      No video
                    </div>
                  )}
                  {active ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <span className="material-symbols-outlined text-lg text-primary">play_circle</span>
                    </div>
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-col gap-1 py-1">
                  <span className="font-label text-[10px] uppercase text-on-surface-variant/60">
                    #{clip.id.slice(0, 8)}
                  </span>
                  <span className="line-clamp-1 font-semibold text-on-surface">{title}</span>
                  <span className="line-clamp-2 text-xs text-on-surface-variant">{desc}</span>
                  <div className="mt-auto">
                    <span className="rounded bg-secondary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-secondary">
                      Pending
                    </span>
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

export default function QaQueueSidebar({
  clips,
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

  const sharedProps = { clips, selectedId, onLogout, loading, selectedGame, availableGames, onGameChange }

  return (
    <>
      <aside className="hidden h-full w-72 shrink-0 flex-col border-r border-white/5 bg-[#0d0d18] font-body text-sm font-medium sm:w-80 lg:flex">
        <QueueSidebarContent {...sharedProps} onSelect={onSelect} />
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
            <QueueSidebarContent {...sharedProps} onSelect={handleDrawerSelect} />
          </aside>
        </>
      ) : null}
    </>
  )
}