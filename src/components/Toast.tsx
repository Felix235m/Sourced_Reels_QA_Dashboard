import { useEffect, useRef } from 'react'

type Props = {
  message: string | null
  onDismiss: () => void
  /** Auto-dismiss delay in ms. Default: 4000 */
  duration?: number
}

/**
 * A bottom-anchored toast notification that auto-dismisses.
 * Positioned above the decision bar and respects iPhone safe-area-inset-bottom.
 */
export default function Toast({ message, onDismiss, duration = 4000 }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Keep a ref so the effect closure always calls the latest onDismiss
  // without needing to restart the timer when the parent re-renders.
  const onDismissRef = useRef(onDismiss)
  useEffect(() => {
    onDismissRef.current = onDismiss
  })

  useEffect(() => {
    if (!message) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onDismissRef.current()
    }, duration)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [message, duration]) // onDismiss intentionally excluded — accessed via ref

  if (!message) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] flex justify-center px-4"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' }}
    >
      <div className="pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl border border-error/30 bg-surface-container-high px-4 py-3 shadow-2xl shadow-black/60 backdrop-blur-md">
        <span
          className="material-symbols-outlined shrink-0 text-xl text-error"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          error
        </span>
        <span className="text-sm font-medium text-on-surface">{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="ml-1 shrink-0 text-on-surface-variant transition hover:text-on-surface"
          aria-label="Dismiss"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
    </div>
  )
}
