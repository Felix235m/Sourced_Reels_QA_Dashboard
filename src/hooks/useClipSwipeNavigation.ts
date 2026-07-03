import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

const SWIPE_COMMIT_PX = 72
const VERTICAL_LOCK_PX = 12
const RUBBER_BAND = 0.28
const SNAP_DURATION_MS = 240

export type ClipSwipePreview = {
  id: string
  videoUrl: string | null
  hookText: string | null
}

export type ClipSwipeNavigationOptions = {
  enabled: boolean
  canSwipeNext: boolean
  canSwipePrev: boolean
  onCommitNext: () => void
  onCommitPrev: () => void
  isScrubbingRef: RefObject<boolean>
  frameHeight: number
}

export type ClipSwipeNavigationState = {
  dragOffsetY: number
  isDragging: boolean
  isSnapping: boolean
}

/**
 * Vertical swipe on the video frame with live drag offset and snap animation.
 * Swipe up → next clip; swipe down → previous clip.
 */
export function useClipSwipeNavigation(
  frameRef: RefObject<HTMLElement | null>,
  options: ClipSwipeNavigationOptions,
): ClipSwipeNavigationState {
  const [dragOffsetY, setDragOffsetY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isSnapping, setIsSnapping] = useState(false)
  const isSnappingRef = useRef(false)
  const snapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    isSnappingRef.current = isSnapping
  }, [isSnapping])

  const cancelSnap = useCallback(() => {
    if (snapTimeoutRef.current !== null) {
      clearTimeout(snapTimeoutRef.current)
      snapTimeoutRef.current = null
    }
    isSnappingRef.current = false
    setIsSnapping(false)
  }, [])

  const touchRef = useRef<{
    startX: number
    startY: number
    vertical: boolean
  } | null>(null)
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  const applyRubberBand = useCallback((dy: number) => {
    const opts = optionsRef.current
    if (dy > 0 && !opts.canSwipePrev) return dy * RUBBER_BAND
    if (dy < 0 && !opts.canSwipeNext) return dy * RUBBER_BAND
    return dy
  }, [])

  /** Animate from the current drag offset to targetY, then reset (optional callback). */
  const runSnap = useCallback(
    (targetY: number, onDone?: () => void) => {
      cancelSnap()
      setIsDragging(false)
      isSnappingRef.current = true
      setIsSnapping(true)
      // Let React paint isSnapping + current offset before changing transform target.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDragOffsetY(targetY)
        })
      })
      snapTimeoutRef.current = window.setTimeout(() => {
        snapTimeoutRef.current = null
        isSnappingRef.current = false
        onDone?.()
        setDragOffsetY(0)
        setIsSnapping(false)
      }, SNAP_DURATION_MS)
    },
    [cancelSnap],
  )

  useEffect(() => {
    const el = frameRef.current
    if (!el) return

    const isExcludedTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false
      return Boolean(target.closest('[data-no-swipe]'))
    }

    const onTouchStart = (e: TouchEvent) => {
      const opts = optionsRef.current
      if (!opts.enabled || opts.isScrubbingRef.current || isExcludedTarget(e.target)) {
        touchRef.current = null
        return
      }
      if (isSnappingRef.current) {
        cancelSnap()
        setDragOffsetY(0)
        setIsDragging(false)
        touchRef.current = null
        return
      }
      const touch = e.touches[0]
      if (!touch) return
      touchRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        vertical: false,
      }
      setIsDragging(false)
    }

    const onTouchMove = (e: TouchEvent) => {
      const opts = optionsRef.current
      const start = touchRef.current
      if (!opts.enabled || !start || opts.isScrubbingRef.current || isSnappingRef.current) return
      const touch = e.touches[0]
      if (!touch) return
      const dy = touch.clientY - start.startY
      const dx = touch.clientX - start.startX
      if (
        Math.abs(dy) > VERTICAL_LOCK_PX &&
        Math.abs(dy) > Math.abs(dx)
      ) {
        start.vertical = true
        setIsDragging(true)
        e.preventDefault()
        setDragOffsetY(applyRubberBand(dy))
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      const opts = optionsRef.current
      const start = touchRef.current
      touchRef.current = null
      if (isSnappingRef.current) {
        return
      }
      if (!opts.enabled || !start?.vertical || opts.isScrubbingRef.current) {
        setIsDragging(false)
        setDragOffsetY(0)
        return
      }
      const touch = e.changedTouches[0]
      if (!touch) return
      const rawDy = touch.clientY - start.startY
      const h = opts.frameHeight || 1
      // Commit uses raw finger travel; rubber band is visual-only during drag.
      const commitNext = rawDy < -SWIPE_COMMIT_PX && opts.canSwipeNext
      const commitPrev = rawDy > SWIPE_COMMIT_PX && opts.canSwipePrev
      if (commitNext) {
        runSnap(-h, opts.onCommitNext)
        return
      }
      if (commitPrev) {
        runSnap(h, opts.onCommitPrev)
        return
      }
      runSnap(0)
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)

    return () => {
      cancelSnap()
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [frameRef, applyRubberBand, runSnap, cancelSnap])

  return { dragOffsetY, isDragging, isSnapping }
}
