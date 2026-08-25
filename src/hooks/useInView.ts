import { useEffect, useRef, useState, type RefObject } from 'react'

type Options = {
  /** How far outside the viewport still counts as "in view". */
  rootMargin?: string
  /** Latch true on first intersection and never report false again. */
  once?: boolean
}

/**
 * Tracks whether the returned ref's element is scrolled within `rootMargin` of the
 * viewport. Used to mount heavy elements (e.g. per-row `<video>` thumbnails) only while
 * they're actually near the screen.
 *
 * By default the flag toggles back off on scroll-away, so consumers *unmount* what they
 * mounted and the live count stays bounded by the viewport rather than growing with the
 * list length. Pass `once` to latch instead, for cheap content where the remount churn
 * costs more than keeping it around.
 */
export function useInView<T extends HTMLElement>(
  { rootMargin = '300px', once = false }: Options = {},
): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.some((entry) => entry.isIntersecting)
        if (once) {
          if (intersecting) {
            setInView(true)
            observer.disconnect()
          }
          return
        }
        setInView(intersecting)
      },
      { rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin, once])

  return [ref, inView]
}
