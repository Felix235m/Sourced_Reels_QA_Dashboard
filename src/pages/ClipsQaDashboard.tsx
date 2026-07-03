import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import QaHeader from '@components/qa/QaHeader'
import ClipsQaQueueSidebar from '@components/clips-qa/ClipsQaQueueSidebar'
import ClipsQaCenterPlayer from '@components/clips-qa/ClipsQaCenterPlayer'
import ClipsQaDetailsPanel from '@components/clips-qa/ClipsQaDetailsPanel'
import ClipsQaFooterShortcuts from '@components/clips-qa/ClipsQaFooterShortcuts'
import ClipsQaDecisionBar from '@components/clips-qa/ClipsQaDecisionBar'
import Toast from '@components/Toast'
import { useAuth } from '@hooks/useAuth'
import { useMobileLayout } from '@hooks/useMobileLayout'
import type { ClipSwipePreview } from '@hooks/useClipSwipeNavigation'
import { fetchReelsQueue, fetchReelGames, submitReelDecision } from '@services/reelService'
import type { Reel } from '@/types/reel'

function toSwipePreview(reel: Reel): ClipSwipePreview {
  return {
    id: reel.reel_id,
    videoUrl: reel.supabase_file_url,
    hookText: null,
  }
}

export default function ClipsQaDashboard() {
  const { signOut } = useAuth()
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
  const isMobileLayout = useMobileLayout()

  const loadQueue = useCallback(async (game: string | null = null) => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchReelsQueue(game)
      setReels(rows)
      setSelectedId((prev) => {
        if (prev && rows.some((r) => r.reel_id === prev)) return prev
        return rows[0]?.reel_id ?? null
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load queue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadQueue(null)
    void fetchReelGames().then(setAvailableGames).catch(() => {})
  }, [loadQueue])

  const handleGameChange = useCallback(
    (game: string | null) => {
      setSelectedGame(game)
      void loadQueue(game)
    },
    [loadQueue],
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
    if (!selectedReel || actionBusy) return
    setActionBusy(true)
    setActionError(null)
    const id = selectedReel.reel_id
    try {
      await submitReelDecision(id, 'approve')
      const rest = reels.filter((r) => r.reel_id !== id)
      const idx = reels.findIndex((r) => r.reel_id === id)
      const nextId = rest[idx]?.reel_id ?? rest[idx - 1]?.reel_id ?? rest[0]?.reel_id ?? null
      setReels(rest)
      setSelectedId(nextId)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Approve failed')
    } finally {
      setActionBusy(false)
    }
  }, [selectedReel, actionBusy, reels])

  const handleReject = useCallback(async () => {
    if (!selectedReel || actionBusy) return
    setActionBusy(true)
    setActionError(null)
    const id = selectedReel.reel_id
    try {
      await submitReelDecision(id, 'reject')
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
  }, [selectedReel, actionBusy, reels])

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
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        void handleApprove()
        return
      }
      if (e.key === 'r' || e.key === 'R') {
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
  }, [togglePlay, handleApprove, handleReject, goToAdjacentReel])

  const handleLogout = useCallback(async () => {
    try {
      await signOut()
    } catch (e) {
      console.error(e)
    }
  }, [signOut])

  const decisionDisabled = !selectedReel || actionBusy

  return (
    <div className="full-viewport flex flex-col overflow-hidden bg-background text-on-surface">
      <QaHeader
        pendingCount={reels.length}
        clipIndex={selectedReelIndex >= 0 ? selectedReelIndex + 1 : null}
        onQueueToggle={() => setQueueDrawerOpen((o) => !o)}
        selectedGame={selectedGame}
        availableGames={availableGames}
        onGameChange={handleGameChange}
      />

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

          <ClipsQaDecisionBar
            onApprove={handleApprove}
            onReject={handleReject}
            disabled={decisionDisabled}
          />
        </div>

        <ClipsQaDetailsPanel reel={selectedReel} durationSec={durationSec} />
      </main>

      <ClipsQaFooterShortcuts />

      <Toast message={actionError} onDismiss={() => setActionError(null)} />
    </div>
  )
}
