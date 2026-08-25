import { useEffect, useRef, useState } from 'react'
import { releaseVideo } from '@/lib/releaseVideo'
import type { ClipSwipePreview } from '@hooks/useClipSwipeNavigation'
import {
  COMPOSE_H,
  COMPOSE_W,
  HOOK_BOTTOM_PX,
  HOOK_SHEAR_DEG,
  HOOK_TEXT_BORDER_W_PX,
  computeHookFontSize,
} from '@/lib/hookTextLayout'

type Props = {
  clip: ClipSwipePreview | null
  /** Shown when there is no adjacent clip at this edge. */
  edgeLabel: string
  frameWidth: number
  /** "prev" | "next" — controls hint icon direction */
  direction: 'prev' | 'next'
  /** 0–1 how visible this peek should be during drag */
  peekOpacity?: number
  /**
   * Whether to actually mount the `<video>`. A peek panel is translated off-frame and
   * invisible until a drag starts, so an inactive one shows the placeholder instead and
   * holds no decoder.
   */
  active?: boolean
}

export default function QaClipPreviewPanel({
  clip,
  edgeLabel,
  frameWidth,
  direction,
  peekOpacity = 0.85,
  active = true,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [errored, setErrored] = useState(false)
  // Reset the error flag synchronously when the panel moves to a different clip —
  // otherwise one clip that fails to load leaves this panel showing "broken_image" for
  // every clip after it. Same state-compare-during-render idiom as the center player.
  const [erroredForClip, setErroredForClip] = useState(clip?.id ?? null)
  if (erroredForClip !== (clip?.id ?? null)) {
    setErroredForClip(clip?.id ?? null)
    setErrored(false)
  }

  const showVideo = Boolean(clip?.videoUrl) && !errored && active

  // Release the decoder as soon as the video stops being rendered, not whenever GC gets
  // around to it. Depending on `showVideo` means the cleanup closes over the element from
  // the render that mounted it, which is the one we need to tear down.
  useEffect(() => {
    const v = videoRef.current
    return () => releaseVideo(v)
  }, [showVideo])

  const hookTrimmed = clip?.hookText?.replace(/\r\n|\r|\n/g, ' ').trim() ?? ''
  const scale = frameWidth > 0 ? frameWidth / COMPOSE_W : 0
  const hookFontPx =
    hookTrimmed.length > 0 && scale > 0 ? computeHookFontSize(hookTrimmed) * scale : 0
  const hookStrokePx = scale > 0 ? HOOK_TEXT_BORDER_W_PX * scale * 2 : 0

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-black"
      style={{ opacity: peekOpacity }}
    >
      {showVideo && clip?.videoUrl ? (
        <video
          ref={videoRef}
          src={clip.videoUrl}
          className="h-full w-full object-contain"
          muted
          playsInline
          preload="metadata"
          onError={() => setErrored(true)}
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 bg-surface-container px-4 text-center">
          <span
            className="material-symbols-outlined text-3xl text-on-surface-variant/40"
            style={{ fontVariationSettings: "'FILL' 0" }}
          >
            {clip?.videoUrl && errored ? 'broken_image' : 'swipe_vertical'}
          </span>
          <span className="text-xs font-medium text-on-surface-variant/60">{edgeLabel}</span>
        </div>
      )}

      {clip?.videoUrl && hookTrimmed.length > 0 && frameWidth > 0 ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div
            className="absolute text-center"
            style={{
              left: '50%',
              bottom: `${((COMPOSE_H - HOOK_BOTTOM_PX) / COMPOSE_H) * 100}%`,
              maxWidth: `${(Math.min(1000, COMPOSE_W - 2 * 40) / COMPOSE_W) * 100}%`,
              transform: `translateX(-50%) skewX(${-HOOK_SHEAR_DEG}deg)`,
              transformOrigin: 'center bottom',
              fontFamily: '"Arial Black", Gadget, sans-serif',
              fontWeight: 900,
              fontSize: `${hookFontPx}px`,
              lineHeight: 1.05,
              color: '#ffffff',
              WebkitTextStroke: `${hookStrokePx}px #000000`,
              paintOrder: 'stroke fill',
              whiteSpace: 'nowrap',
            }}
          >
            {hookTrimmed}
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
        <span className="flex items-center gap-1 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface/80 backdrop-blur-sm">
          <span
            className="material-symbols-outlined text-sm text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {direction === 'next' ? 'keyboard_arrow_down' : 'keyboard_arrow_up'}
          </span>
          {direction === 'next' ? 'Next clip' : 'Previous clip'}
        </span>
      </div>
    </div>
  )
}
