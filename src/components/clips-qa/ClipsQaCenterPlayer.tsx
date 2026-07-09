import { useCallback, useEffect, useRef, useState } from 'react'
import QaClipPreviewPanel from '@components/qa/QaClipPreviewPanel'
import {
  useClipSwipeNavigation,
  type ClipSwipePreview,
} from '@hooks/useClipSwipeNavigation'

type Props = {
  videoUrl: string | null
  /** Original platform URL — shown in the fallback state when videoUrl is null. */
  sourceUrl?: string | null
  clipKey: string | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  onVideoMeta: (durationSec: number | null) => void
  muted: boolean
  onMutedChange: (muted: boolean) => void
  clipSwipeEnabled?: boolean
  canSwipeNext?: boolean
  canSwipePrev?: boolean
  prevClip?: ClipSwipePreview | null
  nextClip?: ClipSwipePreview | null
  onSwipeNext?: () => void
  onSwipePrev?: () => void
  clipPositionLabel?: string | null
}

export default function ClipsQaCenterPlayer({
  videoUrl,
  sourceUrl,
  clipKey,
  videoRef,
  onVideoMeta,
  muted,
  onMutedChange,
  clipSwipeEnabled = false,
  canSwipeNext = false,
  canSwipePrev = false,
  prevClip = null,
  nextClip = null,
  onSwipeNext,
  onSwipePrev,
  clipPositionLabel,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const isScrubbing = useRef(false)
  const [frameHeight, setFrameHeight] = useState(0)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const durationRef = useRef(duration)
  useEffect(() => {
    durationRef.current = duration
  }, [duration])
  const [playing, setPlaying] = useState(false)
  // True while the current clip is still buffering — drives a spinner overlay so the
  // frame never shows an ambiguous dead-black gap while a cold clip loads.
  const [buffering, setBuffering] = useState(Boolean(videoUrl))
  // Reset buffering synchronously during render (not in an effect) the instant clipKey
  // changes, so the new (readyState-0) video element never paints a frame with the old
  // clip's buffering state — e.g. a finished clip's "not buffering" carrying over.
  const [bufferedForKey, setBufferedForKey] = useState(clipKey)
  if (bufferedForKey !== clipKey) {
    setBufferedForKey(clipKey)
    setBuffering(Boolean(videoUrl))
  }

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (!rect) return
      if (rect.height > 0) setFrameHeight(rect.height)
    })
    ro.observe(el)
    const rect = el.getBoundingClientRect()
    if (rect.height > 0) setFrameHeight(rect.height)
    return () => ro.disconnect()
  }, [clipKey])

  useEffect(() => {
    const v = videoRef.current
    if (!v || !videoUrl || !clipKey) return
    v.playbackRate = 1
    v.currentTime = 0
    const tryPlay = () => {
      void v.play().catch(() => {})
    }
    if (v.readyState >= 2) {
      tryPlay()
    } else {
      const onCanPlay = () => {
        v.removeEventListener('canplay', onCanPlay)
        tryPlay()
      }
      v.addEventListener('canplay', onCanPlay)
      return () => v.removeEventListener('canplay', onCanPlay)
    }
  }, [clipKey, videoUrl, videoRef])

  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    setProgress(v.currentTime)
    setDuration(v.duration || 0)
    // currentTime only advances during real playback, so this is a reliable signal
    // that the clip is rendering even if a stray waiting/stalled event left the
    // buffering overlay stuck on.
    setBuffering(false)
  }, [videoRef])

  const onLoadedMeta = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    const d = v.duration
    onVideoMeta(Number.isFinite(d) ? d : null)
    setDuration(Number.isFinite(d) ? d : 0)
  }, [videoRef, onVideoMeta])

  const onPlay = useCallback(() => setPlaying(true), [])
  const onPause = useCallback(() => setPlaying(false), [])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v || !videoUrl) return
    if (v.paused) void v.play()
    else v.pause()
  }, [videoRef, videoUrl])

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const v = videoRef.current
      if (!v || !durationRef.current) return
      const rect = progressBarRef.current?.getBoundingClientRect()
      if (!rect) return
      const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      v.currentTime = pct * durationRef.current
    },
    [videoRef],
  )

  useEffect(() => {
    const el = progressBarRef.current
    if (!el) return
    const handler = (e: TouchEvent) => {
      if (!isScrubbing.current) return
      e.preventDefault()
      const touch = e.touches[0]
      if (touch) seekFromClientX(touch.clientX)
    }
    el.addEventListener('touchmove', handler, { passive: false })
    return () => el.removeEventListener('touchmove', handler)
  }, [seekFromClientX])

  const useSwipeStack = clipSwipeEnabled && frameHeight > 0

  const { dragOffsetY, isDragging, isSnapping } = useClipSwipeNavigation(frameRef, {
    enabled: useSwipeStack && Boolean(onSwipeNext && onSwipePrev),
    canSwipeNext,
    canSwipePrev,
    onCommitNext: onSwipeNext ?? (() => {}),
    onCommitPrev: onSwipePrev ?? (() => {}),
    isScrubbingRef: isScrubbing,
    frameHeight,
  })

  const dragProgress =
    frameHeight > 0 ? Math.min(1, Math.abs(dragOffsetY) / frameHeight) : 0
  const peekPanelOpacity = 0.55 + dragProgress * 0.45

  const pct = duration > 0 ? (progress / duration) * 100 : 0

  const trackTransition =
    isDragging || !isSnapping
      ? 'none'
      : 'transform 240ms cubic-bezier(0.32, 0.72, 0, 1)'

  const currentClipPanel = (
    <div className="relative h-full w-full">
      {videoUrl ? (
        <video
          key={clipKey ?? undefined}
          ref={videoRef}
          src={videoUrl}
          className="relative z-0 h-full w-full object-contain"
          playsInline
          muted={muted}
          preload="auto"
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMeta}
          onWaiting={() => setBuffering(true)}
          onStalled={() => setBuffering(true)}
          onCanPlay={() => setBuffering(false)}
          onPlaying={() => setBuffering(false)}
          onLoadedData={() => setBuffering(false)}
          onPlay={onPlay}
          onPause={onPause}
          onEnded={onPause}
        />
      ) : (
        <div className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-3 p-6 text-center text-on-surface-variant">
          <span
            className="material-symbols-outlined text-3xl opacity-40"
            style={{ fontVariationSettings: "'FILL' 0" }}
          >
            videocam_off
          </span>
          <p className="text-sm">Video not yet downloaded</p>
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-primary transition-colors hover:border-primary/40"
            >
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              View on platform
            </a>
          ) : null}
        </div>
      )}

      {videoUrl && buffering ? (
        <div
          className="pointer-events-none absolute inset-0 z-[16] flex items-center justify-center bg-black/60"
          aria-hidden
        >
          <span className="material-symbols-outlined animate-spin text-4xl text-primary/60">
            progress_activity
          </span>
        </div>
      ) : null}

      {videoUrl && muted ? (
        <button
          type="button"
          onClick={() => onMutedChange(false)}
          className="absolute right-3 top-3 z-[18] flex cursor-pointer items-center gap-1 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 font-label text-[10px] font-bold uppercase tracking-wider text-on-surface/80 backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-black/65 hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label="Unmute"
        >
          <span
            className="material-symbols-outlined text-sm text-on-surface/70"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            volume_off
          </span>
          Mute
        </button>
      ) : null}

      {videoUrl ? (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 z-[17] flex cursor-pointer items-center justify-center border-0 bg-transparent p-0"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          <span
            className={`pointer-events-none flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-black/40 shadow-[0_0_30px_rgba(189,157,255,0.3)] backdrop-blur-md transition-transform duration-300 ${
              playing ? 'scale-90 opacity-0 group-hover:opacity-100' : 'scale-100 opacity-100'
            } group-hover:scale-110`}
            aria-hidden
          >
            <span
              className="material-symbols-outlined text-5xl text-primary sm:text-6xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {playing ? 'pause' : 'play_arrow'}
            </span>
          </span>
        </button>
      ) : null}

      <div
        data-no-swipe
        className="pointer-events-none absolute inset-x-0 bottom-0 z-30 space-y-4 bg-gradient-to-t from-black/80 to-transparent p-4 sm:p-8"
      >
        <div
          ref={progressBarRef}
          data-no-swipe
          role="slider"
          tabIndex={0}
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="group/progress pointer-events-auto relative h-1 w-full cursor-pointer rounded-full bg-white/20"
          onClick={(e) => seekFromClientX(e.clientX)}
          onTouchStart={(e) => {
            isScrubbing.current = true
            const touch = e.touches[0]
            if (touch) seekFromClientX(touch.clientX)
          }}
          onTouchEnd={() => {
            isScrubbing.current = false
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault()
              const v = videoRef.current
              if (!v || !duration) return
              const delta = e.key === 'ArrowRight' ? 5 : -5
              v.currentTime = Math.min(duration, Math.max(0, v.currentTime + delta))
            }
          }}
        >
          <div
            className="absolute h-full rounded-full bg-primary"
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white opacity-0 transition-transform group-hover/progress:opacity-100"
            style={{ left: `calc(${pct}% - 6px)` }}
          />
        </div>

        <div className="pointer-events-auto flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={togglePlay}
            className="material-symbols-outlined text-2xl text-on-surface transition-transform hover:scale-110 sm:text-3xl"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? 'pause' : 'play_arrow'}
          </button>
          <button
            type="button"
            onClick={() => onMutedChange(!muted)}
            className="material-symbols-outlined text-xl text-on-surface/60 transition-all hover:text-on-surface sm:text-2xl"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? 'volume_off' : 'volume_up'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <section className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overflow-x-hidden bg-surface-container-lowest p-4 sm:p-6 lg:pb-6">
      <div className="relative flex min-h-0 w-full max-w-md flex-1 flex-col items-center justify-center">
        <div
          ref={frameRef}
          className="qa-video-frame group relative aspect-[9/16] w-full max-w-[min(100%,min(420px,calc((100dvh-14rem)*9/16)))] shrink-0 overflow-hidden rounded-xl border border-white/5 bg-black shadow-2xl shadow-primary/10"
          style={{ touchAction: clipSwipeEnabled ? 'pan-x' : undefined }}
        >
          {clipPositionLabel ? (
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {clipPositionLabel}
            </p>
          ) : null}

          {useSwipeStack ? (
            <>
              <div
                className="flex w-full flex-col will-change-transform"
                style={{
                  transform: `translateY(${-frameHeight + dragOffsetY}px)`,
                  transition: trackTransition,
                }}
              >
                <div className="shrink-0" style={{ height: frameHeight }}>
                  <QaClipPreviewPanel
                    clip={prevClip}
                    edgeLabel="Start of queue"
                    frameWidth={0}
                    direction="prev"
                    peekOpacity={peekPanelOpacity}
                  />
                </div>
                <div
                  className="relative shrink-0"
                  style={{
                    height: frameHeight,
                    transform: `scale(${1 - dragProgress * 0.03})`,
                    transition: isDragging ? 'none' : 'transform 240ms ease-out',
                  }}
                >
                  {currentClipPanel}
                  {isDragging && dragProgress > 0.02 ? (
                    <div
                      className="pointer-events-none absolute inset-0 z-[25] bg-black/30"
                      aria-hidden
                    />
                  ) : null}
                </div>
                <div className="shrink-0" style={{ height: frameHeight }}>
                  <QaClipPreviewPanel
                    clip={nextClip}
                    edgeLabel="End of queue"
                    frameWidth={0}
                    direction="next"
                    peekOpacity={peekPanelOpacity}
                  />
                </div>
              </div>

              <div
                className={`qa-swipe-arrows pointer-events-none absolute right-2 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1 rounded-full border border-white/10 bg-black/40 px-1 py-2 backdrop-blur-sm ${
                  isDragging || isSnapping ? 'opacity-0' : ''
                }`}
                aria-hidden
              >
                {canSwipePrev ? (
                  <span className="material-symbols-outlined text-lg text-primary opacity-40">
                    keyboard_arrow_up
                  </span>
                ) : null}
                <span className="h-1 w-1 rounded-full bg-white/30" />
                {canSwipeNext ? (
                  <span className="material-symbols-outlined text-lg text-primary opacity-40">
                    keyboard_arrow_down
                  </span>
                ) : null}
              </div>

              <p
                className={`qa-swipe-hint pointer-events-none absolute bottom-3 left-0 right-0 z-40 text-center text-[10px] font-medium tracking-wide text-on-surface-variant/50 ${
                  isDragging || isSnapping ? 'opacity-0' : ''
                }`}
                aria-hidden
              >
                Swipe up or down to change clip
              </p>
            </>
          ) : (
            currentClipPanel
          )}
        </div>
      </div>
    </section>
  )
}
