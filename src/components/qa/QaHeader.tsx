import GameFilterDropdown from '@components/qa/GameFilterDropdown'

type Props = {
  pendingCount: number
  /** 1-based index of the clip currently shown (mobile swipe position). */
  clipIndex?: number | null
  onQueueToggle: () => void
  selectedGame: string | null
  availableGames: string[]
  onGameChange: (game: string | null) => void
}

export default function QaHeader({
  pendingCount,
  clipIndex,
  onQueueToggle,
  selectedGame,
  availableGames,
  onGameChange,
}: Props) {
  const clipPositionLabel =
    clipIndex != null && pendingCount > 0 ? `${clipIndex}/${pendingCount}` : String(pendingCount)

  return (
    <header className="sticky top-0 z-50 flex w-full shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-surface/80 px-4 py-3 shadow-[0_0_24px_rgba(189,157,255,0.04)] backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2.5 md:gap-8">
        <button
          type="button"
          onClick={onQueueToggle}
          className="flex shrink-0 items-center justify-center rounded-lg border border-white/10 bg-surface-container-high p-1.5 transition hover:border-primary/30 hover:bg-surface-container lg:hidden"
          aria-label="Open queue"
        >
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>
            queue_music
          </span>
        </button>

        <span className="font-headline text-lg font-black italic tracking-tighter text-primary sm:text-xl">
          mSocial
        </span>

        <span
          className="rounded-full bg-surface-bright px-2.5 py-0.5 text-[11px] font-bold text-secondary tabular-nums lg:hidden"
          title="Clip position in queue"
        >
          {clipPositionLabel}
        </span>

        <nav className="hidden items-center gap-6 font-headline font-bold tracking-tight md:flex">
          <span className="border-b-2 border-primary pb-1 text-primary">QA Mode</span>
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-4 sm:gap-6">
        {availableGames.length > 0 ? (
          <div className="min-w-0 lg:hidden">
            <GameFilterDropdown
              selectedGame={selectedGame}
              availableGames={availableGames}
              onGameChange={onGameChange}
            />
          </div>
        ) : null}
        <div className="hidden flex-col items-end text-right text-xs font-label uppercase tracking-widest text-on-surface-variant lg:flex">
          <span className="font-bold text-secondary">{pendingCount} Pending</span>
          <span className="text-on-surface-variant/60">Queue</span>
        </div>
      </div>
    </header>
  )
}
