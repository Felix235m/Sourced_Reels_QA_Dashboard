import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import QaHeader from '@components/qa/QaHeader'
import QaQueueSidebar from '@components/qa/QaQueueSidebar'
import QaCenterPlayer from '@components/qa/QaCenterPlayer'
import QaDetailsPanel from '@components/qa/QaDetailsPanel'
import QaFooterShortcuts from '@components/qa/QaFooterShortcuts'
import QaDecisionBar from '@components/qa/QaDecisionBar'
import QaClipTitleEditor from '@components/qa/QaClipTitleEditor'
import Toast from '@components/Toast'
import { useAuth } from '@hooks/useAuth'
import { useMobileLayout } from '@hooks/useMobileLayout'
import type { ClipSwipePreview } from '@hooks/useClipSwipeNavigation'
import { fetchQaQueue, submitQaDecision, fetchAssignedGames } from '@services/qaClipService'
import type { QaClip } from '@/types/qaClip'

function toSwipePreview(clip: QaClip): ClipSwipePreview {
  return {
    id: clip.id,
    videoUrl: clip.composed_video_url,
    hookText: clip.best_title,
  }
}

export default function QaDashboard() {
  const { signOut } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)

  const [clips, setClips] = useState<QaClip[]>([])
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
  const [titleEditingOpen, setTitleEditingOpen] = useState(false)
  const isMobileLayout = useMobileLayout()

  const loadQueue = useCallback(async (game: string | null = null) => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchQaQueue(game)
      setClips(rows)
      setSelectedId((prev) => {
        if (prev && rows.some((r) => r.id === prev)) return prev
        return rows[0]?.id ?? null
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load queue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadQueue(null)
    void fetchAssignedGames().then(setAvailableGames).catch(() => {})
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

  const selectedClip = useMemo(
    () => clips.find((c) => c.id === selectedId) ?? null,
    [clips, selectedId],
  )

  const selectedClipIndex = useMemo(() => {
    if (!selectedId || clips.length === 0) return -1
    const idx = clips.findIndex((c) => c.id === selectedId)
    return idx >= 0 ? idx : -1
  }, [clips, selectedId])

  const swipeAdjacent = useMemo(() => {
    const len = clips.length
    const idx = selectedClipIndex
    if (len === 0 || idx < 0 || idx >= len) {
      return { prev: null, next: null, canPrev: false, canNext: false }
    }
    const prevClip = idx > 0 ? clips[idx - 1] : undefined
    const nextClip = idx < len - 1 ? clips[idx + 1] : undefined
    return {
      prev: prevClip ? toSwipePreview(prevClip) : null,
      next: nextClip ? toSwipePreview(nextClip) : null,
      canPrev: idx > 0,
      canNext: idx < len - 1,
    }
  }, [clips, selectedClipIndex])

  const clipsRef = useRef(clips)
  const selectedIdRef = useRef(selectedId)
  useEffect(() => {
    clipsRef.current = clips
    selectedIdRef.current = selectedId
  })

  const goToAdjacentClip = useCallback((delta: 1 | -1) => {
    const queue = clipsRef.current
    const id = selectedIdRef.current
    if (!id || queue.length < 2) return
    const idx = queue.findIndex((c) => c.id === id)
    if (idx < 0) return
    const next = queue[idx + delta]
    if (next) setSelectedId(next.id)
  }, [])

  const onSwipeNextClip = useCallback(() => goToAdjacentClip(1), [goToAdjacentClip])
  const onSwipePrevClip = useCallback(() => goToAdjacentClip(-1), [goToAdjacentClip])

  const clipSwipeEnabled =
    isMobileLayout &&
    !loading &&
    !actionBusy &&
    !queueDrawerOpen &&
    !titleEditingOpen &&
    clips.length > 1

  const clipPositionLabel =
    selectedClipIndex >= 0 && clips.length > 0
      ? `Clip ${selectedClipIndex + 1} of ${clips.length}`
      : null

  useEffect(() => {
    if (selectedId && !clips.some((c) => c.id === selectedId)) {
      setSelectedId(clips[0]?.id ?? null)
    }
  }, [clips, selectedId])

  const onVideoMeta = useCallback((_w: number | null, _h: number | null, d: number | null) => {
    setDurationSec(d)
  }, [])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) void v.play()
    else v.pause()
  }, [])

  const handleApprove = useCallback(async () => {
    if (!selectedClip || actionBusy) return
    setActionBusy(true)
    setActionError(null)
    const id = selectedClip.id
    try {
      await submitQaDecision(id, 'approved')
      const rest = clips.filter((c) => c.id !== id)
      const idx = clips.findIndex((c) => c.id === id)
      const nextId = rest[idx]?.id ?? rest[idx - 1]?.id ?? rest[0]?.id ?? null
      setClips(rest)
      setSelectedId(nextId)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Approve failed')
    } finally {
      setActionBusy(false)
    }
  }, [selectedClip, actionBusy, clips])

  const handleReject = useCallback(async () => {
    if (!selectedClip || actionBusy) return
    setActionBusy(true)
    setActionError(null)
    const id = selectedClip.id
    try {
      await submitQaDecision(id, 'rejected')
      const rest = clips.filter((c) => c.id !== id)
      const idx = clips.findIndex((c) => c.id === id)
      const nextId = rest[idx]?.id ?? rest[idx - 1]?.id ?? rest[0]?.id ?? null
      setClips(rest)
      setSelectedId(nextId)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Reject failed')
    } finally {
      setActionBusy(false)
    }
  }, [selectedClip, actionBusy, clips])

  const handleVisionTraining = useCallback(async () => {
    if (!selectedClip || actionBusy) return
    setActionBusy(true)
    setActionError(null)
    const id = selectedClip.id
    try {
      await submitQaDecision(id, 'vision_training')
      const rest = clips.filter((c) => c.id !== id)
      const idx = clips.findIndex((c) => c.id === id)
      const nextId = rest[idx]?.id ?? rest[idx - 1]?.id ?? rest[0]?.id ?? null
      setClips(rest)
      setSelectedId(nextId)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Vision training flag failed')
    } finally {
      setActionBusy(false)
    }
  }, [selectedClip, actionBusy, clips])

  const handleClipTitleUpdated = useCallback((clipId: string, bestTitle: string | null) => {
    setClips((prev) =>
      prev.map((c) => (c.id === clipId ? { ...c, best_title: bestTitle } : c)),
    )
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      const typing =
        t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable

      if (typing) return

      // Avoid treating browser shortcuts as QA actions (e.g. Ctrl+R / Cmd+R = refresh
      // would otherwise match key "r" and call Reject).
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
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        void handleVisionTraining()
        return
      }
      if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'K') {
        e.preventDefault()
        goToAdjacentClip(-1)
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'J') {
        e.preventDefault()
        goToAdjacentClip(1)
        return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay, handleApprove, handleReject, handleVisionTraining, goToAdjacentClip])

  const handleLogout = useCallback(async () => {
    try {
      await signOut()
    } catch (e) {
      console.error(e)
    }
  }, [signOut])

  const decisionDisabled = !selectedClip || actionBusy

  return (
    <div className="full-viewport flex flex-col overflow-hidden bg-background text-on-surface">
      <QaHeader
        pendingCount={clips.length}
        clipIndex={selectedClipIndex >= 0 ? selectedClipIndex + 1 : null}
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
        <QaQueueSidebar
          clips={clips}
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
          <div className="lg:hidden">
            <QaClipTitleEditor
              clip={selectedClip}
              editDisabled={decisionDisabled}
              onTitleUpdated={handleClipTitleUpdated}
              onEditingChange={setTitleEditingOpen}
              variant="compact"
            />
          </div>

          <QaCenterPlayer
            videoUrl={selectedClip?.composed_video_url ?? null}
            clipKey={selectedId}
            videoRef={videoRef}
            onVideoMeta={onVideoMeta}
            hookText={selectedClip?.best_title ?? null}
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

          <QaDecisionBar
            onApprove={handleApprove}
            onReject={handleReject}
            onVisionTraining={handleVisionTraining}
            disabled={decisionDisabled}
          />
        </div>

        <QaDetailsPanel
          clip={selectedClip}
          durationSec={durationSec}
          editDisabled={decisionDisabled}
          onTitleUpdated={handleClipTitleUpdated}
        />
      </main>

      <QaFooterShortcuts />

      <Toast message={actionError} onDismiss={() => setActionError(null)} />
    </div>
  )
}
