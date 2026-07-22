import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import QaHeader from '@components/qa/QaHeader'
import ClipsQaQueueSidebar from '@components/clips-qa/ClipsQaQueueSidebar'
import ClipsQaCenterPlayer from '@components/clips-qa/ClipsQaCenterPlayer'
import ClipsQaDetailsPanel from '@components/clips-qa/ClipsQaDetailsPanel'
import ClipsQaFooterShortcuts from '@components/clips-qa/ClipsQaFooterShortcuts'
import ClipsQaDecisionBar from '@components/clips-qa/ClipsQaDecisionBar'
import VideoPreloader from '@components/clips-qa/VideoPreloader'
import Toast from '@components/Toast'
import { useAuth } from '@hooks/useAuth'
import { useMobileLayout } from '@hooks/useMobileLayout'
import type { ClipSwipePreview } from '@hooks/useClipSwipeNavigation'
import {
  fetchReelsQueue,
  fetchReelGames,
  fetchMostRecentlyReviewedGame,
  submitReelDecision,
  getApprovedTodayCount,
  getInQueueCount,
  type ReelView,
} from '@services/reelService'
import type { Reel } from '@/types/reel'
import type { QaTeamUser } from '@/types/team'

function toSwipePreview(reel: Reel): ClipSwipePreview {
  return {
    id: reel.reel_id,
    videoUrl: reel.supabase_file_url,
    hookText: null,
  }
}

export default function ClipsQaDashboard() {
  const { signOut } = useAuth()
  const teamRow = useOutletContext<QaTeamUser | null>()
  const allAccess = teamRow?.role === 'qa'
  // The all-access qa role is a supervisor: it can view every reviewer's queue
  // and the per-game counts, but must not approve/reject reels.
  const readOnly = allAccess
  const videoRef = useRef<HTMLVideoElement>(null)

  const [reels, setReels] = useState<Reel[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionBusy, setActionBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [muted, setMuted] = useState(true)
  const [durationSec, setDurationSec] = useState<number | null>(null)
  const [queueDrawerOpen, setQueueDrawerOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [availableGames, setAvailableGames] = useState<string[]>([])
  const [approvedToday, setApprovedToday] = useState(0)
  // Count of validated ("In Queue") reels for the selected game. Used only while
  // the Rejected view is active, where reels holds rejected clips instead.
  const [inQueueCount, setInQueueCount] = useState(0)
  // Supervisor (read-only qa) can switch between the live validated queue and
  // reels rejected in the last 48h. Reviewers always see the validated queue.
  const [view, setView] = useState<ReelView>('validated')
  const isMobileLayout = useMobileLayout()

  const loadQueue = useCallback(
    async (
      game: string | null = null,
      allAccessOverride = allAccess,
      viewOverride: ReelView = view,
    ) => {
      setLoading(true)
      setError(null)
      // Clear the current queue immediately so the previous view's reels never
      // linger on screen while the new query is in flight.
      setReels([])
      setSelectedId(null)
      try {
        const rows = await fetchReelsQueue(game, allAccessOverride, viewOverride)
        setReels(rows)
        setSelectedId(rows[0]?.reel_id ?? null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load queue')
      } finally {
        setLoading(false)
      }
    },
    [allAccess, view],
  )

  useEffect(() => {
    if (!teamRow) return
    void fetchReelGames(allAccess, view).then(async (games) => {
      setAvailableGames(games)
      // If every game's pending queue is clear, fall back to whichever game was
      // most recently reviewed today so the daily-target badge keeps showing
      // real progress instead of resetting (no pending games left to default to).
      const defaultGame = games[0] ?? (await fetchMostRecentlyReviewedGame(allAccess).catch(() => null))
      setSelectedGame(defaultGame)
      void loadQueue(defaultGame, allAccess, view)
      if (defaultGame) {
        void getApprovedTodayCount(defaultGame, allAccess)
          .then(setApprovedToday)
          .catch(() => {})
      }
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamRow, allAccess])

  const handleGameChange = useCallback(
    (game: string | null) => {
      setSelectedGame(game)
      void loadQueue(game)
      if (game) {
        void getApprovedTodayCount(game, allAccess).then(setApprovedToday).catch(() => {})
      } else {
        setApprovedToday(0)
      }
      // The top-right "In Queue" count always reflects validated clips, so keep it
      // fresh even while the Rejected view is showing rejected reels.
      if (view === 'rejected') {
        void getInQueueCount(game, allAccess).then(setInQueueCount).catch(() => {})
      }
    },
    [loadQueue, allAccess, view],
  )

  const handleViewChange = useCallback(
    (nextView: ReelView) => {
      if (nextView === view) return
      // Switch the toggle and blank the queue synchronously so the old view's
      // reels can't stay on screen during the async reload.
      setView(nextView)
      setReels([])
      setSelectedId(null)
      setLoading(true)
      setError(null)
      void (async () => {
        try {
          const games = await fetchReelGames(allAccess, nextView)
          setAvailableGames(games)
          const nextGame =
            selectedGame && games.includes(selectedGame)
              ? selectedGame
              : games[0] ?? (await fetchMostRecentlyReviewedGame(allAccess).catch(() => null))
          setSelectedGame(nextGame)
          await loadQueue(nextGame, allAccess, nextView)
          if (nextGame) {
            void getApprovedTodayCount(nextGame, allAccess).then(setApprovedToday).catch(() => {})
          } else {
            setApprovedToday(0)
          }
          // Snapshot the validated "In Queue" total so the top-right count keeps
          // showing validated clips while the Rejected view is active.
          if (nextView === 'rejected') {
            void getInQueueCount(nextGame, allAccess).then(setInQueueCount).catch(() => {})
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to load reels')
          setLoading(false)
        }
      })()
    },
    [view, allAccess, selectedGame, loadQueue],
  )

  useEffect(() => {
    setDurationSec(null)
  }, [selectedId])

  const selectedReel = useMemo(
    () => reels.find((r) => r.reel_id === selectedId) ?? null,
    [reels, selectedId],
  )

  const selectedReelIndex = useMemo(() => {
    if (!selectedId || reels.length === 0) return -1
    const idx = reels.findIndex((r) => r.reel_id === selectedId)
    return idx >= 0 ? idx : -1
  }, [reels, selectedId])

  const swipeAdjacent = useMemo(() => {
    const len = reels.length
    const idx = selectedReelIndex
    if (len === 0 || idx < 0 || idx >= len) {
      return { prev: null, next: null, canPrev: false, canNext: false }
    }
    const prevReel = idx > 0 ? reels[idx - 1] : undefined
    const nextReel = idx < len - 1 ? reels[idx + 1] : undefined
    return {
      prev: prevReel ? toSwipePreview(prevReel) : null,
      next: nextReel ? toSwipePreview(nextReel) : null,
      canPrev: idx > 0,
      canNext: idx < len - 1,
    }
  }, [reels, selectedReelIndex])

  const reelsRef = useRef(reels)
  const selectedIdRef = useRef(selectedId)
  useEffect(() => {
    reelsRef.current = reels
    selectedIdRef.current = selectedId
  })

  const goToAdjacentReel = useCallback((delta: 1 | -1) => {
    const queue = reelsRef.current
    const id = selectedIdRef.current
    if (!id || queue.length < 2) return
    const idx = queue.findIndex((r) => r.reel_id === id)
    if (idx < 0) return
    const next = queue[idx + delta]
    if (next) setSelectedId(next.reel_id)
  }, [])

  const onSwipeNextClip = useCallback(() => goToAdjacentReel(1), [goToAdjacentReel])
  const onSwipePrevClip = useCallback(() => goToAdjacentReel(-1), [goToAdjacentReel])

  const clipSwipeEnabled =
    isMobileLayout && !loading && !actionBusy && !queueDrawerOpen && reels.length > 1

  const clipPositionLabel =
    selectedReelIndex >= 0 && reels.length > 0
      ? `Reel ${selectedReelIndex + 1} of ${reels.length}`
      : null

  useEffect(() => {
    if (selectedId && !reels.some((r) => r.reel_id === selectedId)) {
      setSelectedId(reels[0]?.reel_id ?? null)
    }
  }, [reels, selectedId])

  const onVideoMeta = useCallback((d: number | null) => {
    setDurationSec(d)
  }, [])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) void v.play()
    else v.pause()
  }, [])

  const handleApprove = useCallback(async () => {
    if (!selectedReel || actionBusy || readOnly) return
    setActionBusy(true)
    setActionError(null)
    const id = selectedReel.reel_id
    try {
      await submitReelDecision(id, 'approve', allAccess)
      const rest = reels.filter((r) => r.reel_id !== id)
      const idx = reels.findIndex((r) => r.reel_id === id)
      const nextId = rest[idx]?.reel_id ?? rest[idx - 1]?.reel_id ?? rest[0]?.reel_id ?? null
      setReels(rest)
      setSelectedId(nextId)
      setApprovedToday((n) => n + 1)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Approve failed')
    } finally {
      setActionBusy(false)
    }
  }, [selectedReel, actionBusy, reels, allAccess, readOnly])

  const handleReject = useCallback(async () => {
    if (!selectedReel || actionBusy || readOnly) return
    setActionBusy(true)
    setActionError(null)
    const id = selectedReel.reel_id
    try {
      await submitReelDecision(id, 'reject', allAccess)
      const rest = reels.filter((r) => r.reel_id !== id)
      const idx = reels.findIndex((r) => r.reel_id === id)
      const nextId = rest[idx]?.reel_id ?? rest[idx - 1]?.reel_id ?? rest[0]?.reel_id ?? null
      setReels(rest)
      setSelectedId(nextId)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Reject failed')
    } finally {
      setActionBusy(false)
    }
  }, [selectedReel, actionBusy, reels, allAccess, readOnly])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      const typing =
        t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable
      if (typing) return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      if (e.code === 'Space') {
        e.preventDefault()
        togglePlay()
        return
      }
      if (!readOnly && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault()
        void handleApprove()
        return
      }
      if (!readOnly && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault()
        void handleReject()
        return
      }
      if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'K') {
        e.preventDefault()
        goToAdjacentReel(-1)
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'J') {
        e.preventDefault()
        goToAdjacentReel(1)
        return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay, handleApprove, handleReject, goToAdjacentReel, readOnly])

  const handleLogout = useCallback(async () => {
    try {
      await signOut()
    } catch (e) {
      console.error(e)
    }
  }, [signOut])

  const decisionDisabled = !selectedReel || actionBusy
  // Top-right counter always reflects the validated "In Queue" clips. In the
  // validated view that's the live queue length; in the rejected view it's the
  // separately-fetched validated count.
  const queueCount = view === 'validated' ? reels.length : inQueueCount

  return (
    <div className="full-viewport flex flex-col overflow-hidden bg-background text-on-surface">
      <QaHeader
        pendingCount={reels.length}
        queueCount={queueCount}
        clipIndex={selectedReelIndex >= 0 ? selectedReelIndex + 1 : null}
        onQueueToggle={() => setQueueDrawerOpen((o) => !o)}
        selectedGame={selectedGame}
        availableGames={availableGames}
        onGameChange={handleGameChange}
        approvedToday={approvedToday}
      />

      {readOnly ? (
        <div className="flex shrink-0 justify-center border-b border-white/10 bg-surface/60 px-4 py-2">
          <div className="inline-flex items-stretch rounded-lg border border-white/10 bg-surface-container p-0.5">
            {(['validated', 'rejected'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => handleViewChange(v)}
                aria-pressed={view === v}
                className={`cursor-pointer rounded-md px-5 py-1.5 text-center text-xs font-bold uppercase tracking-widest transition ${
                  view === v
                    ? 'bg-primary/20 text-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {v === 'validated' ? 'In Queue' : 'Rejected · 48h'}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="shrink-0 border-b border-error/30 bg-error-container/20 px-4 py-2 text-center text-sm text-on-error-container"
        >
          {error}
        </div>
      ) : null}

      <main className="relative flex min-h-0 flex-1 overflow-hidden pb-0 lg:pb-12">
        <ClipsQaQueueSidebar
          reels={reels}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onLogout={handleLogout}
          loading={loading}
          drawerOpen={queueDrawerOpen}
          onDrawerClose={() => setQueueDrawerOpen(false)}
          selectedGame={selectedGame}
          availableGames={availableGames}
          onGameChange={handleGameChange}
          countNoun={view === 'rejected' ? 'Total' : 'Remaining'}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <ClipsQaCenterPlayer
            videoUrl={selectedReel?.supabase_file_url ?? null}
            sourceUrl={selectedReel?.url ?? null}
            clipKey={selectedId}
            videoRef={videoRef}
            onVideoMeta={onVideoMeta}
            muted={muted}
            onMutedChange={setMuted}
            clipSwipeEnabled={clipSwipeEnabled}
            canSwipeNext={swipeAdjacent.canNext}
            canSwipePrev={swipeAdjacent.canPrev}
            prevClip={swipeAdjacent.prev}
            nextClip={swipeAdjacent.next}
            onSwipeNext={onSwipeNextClip}
            onSwipePrev={onSwipePrevClip}
            clipPositionLabel={clipPositionLabel}
          />

          <VideoPreloader urls={[swipeAdjacent.next?.videoUrl, swipeAdjacent.prev?.videoUrl]} />

          {readOnly ? (
            <div className="shrink-0 border-t border-white/10 bg-[#0d0d18]/95 px-3 py-3 text-center text-xs font-label uppercase tracking-widest text-on-surface-variant">
              View-only · reviewing is disabled for this role
            </div>
          ) : (
            <ClipsQaDecisionBar
              onApprove={handleApprove}
              onReject={handleReject}
              disabled={decisionDisabled}
            />
          )}
        </div>

        <ClipsQaDetailsPanel reel={selectedReel} durationSec={durationSec} />
      </main>

      <ClipsQaFooterShortcuts readOnly={readOnly} />

      <Toast message={actionError} onDismiss={() => setActionError(null)} />
    </div>
  )
}
