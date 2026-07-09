import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Reports true once the returned ref's element has been scrolled within
 * `rootMargin` of the viewport, and stays true thereafter (does not toggle
 * back off on scroll-away). Used to defer mounting heavy elements (e.g.
 * per-row <video> thumbnails) until they're actually about to be seen.
 */
export function useInView<T extends HTMLElement>(
  rootMargin = '300px',
): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    if (inView) return
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [inView, rootMargin])

  return [ref, inView]
}
