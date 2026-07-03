import { useCallback, useEffect, useRef, useState } from 'react'
import type { QaClip } from '@/types/qaClip'
import { updateClipBestTitle } from '@services/qaClipService'

/** Returns the visual viewport's top offset and height, updated as the keyboard opens/closes. */
function useVisualViewport(active: boolean) {
  const [vvTop, setVvTop] = useState(0)
  const [vvHeight, setVvHeight] = useState(() =>
    typeof window !== 'undefined' ? (window.visualViewport?.height ?? window.innerHeight) : 600,
  )
  useEffect(() => {
    if (!active) return
    const update = () => {
      const vv = window.visualViewport
      if (vv) {
        setVvTop(vv.offsetTop)
        setVvHeight(vv.height)
      }
    }
    update()
    const vv = window.visualViewport
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
    }
  }, [active])
  return { vvTop, vvHeight }
}

type Props = {
  clip: QaClip | null
  editDisabled: boolean
  onTitleUpdated: (clipId: string, bestTitle: string | null) => void
  /** Compact strip for mobile/tablet; panel block for details sidebar */
  variant: 'compact' | 'panel'
  className?: string
  /** Notifies parent when compact title modal is open (blocks swipe navigation). */
  onEditingChange?: (editing: boolean) => void
}

export default function QaClipTitleEditor({
  clip,
  editDisabled,
  onTitleUpdated,
  variant,
  className = '',
  onEditingChange,
}: Props) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [titleSaving, setTitleSaving] = useState(false)
  const [titleError, setTitleError] = useState<string | null>(null)
  const compactInputRef = useRef<HTMLInputElement>(null)
  const { vvTop, vvHeight } = useVisualViewport(variant === 'compact' && editingTitle)

  // Reset editor only when the selected clip changes, not on every title update.
  useEffect(() => {
    setEditingTitle(false)
    setDraftTitle(clip?.best_title ?? '')
    setTitleError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clip?.id is intentional
  }, [clip?.id])

  useEffect(() => {
    if (variant === 'compact') {
      onEditingChange?.(editingTitle)
    }
  }, [variant, editingTitle, onEditingChange])

  useEffect(() => {
    if (!editingTitle) {
      setDraftTitle(clip?.best_title ?? '')
    }
  }, [clip?.best_title, editingTitle])

  const startEditTitle = useCallback(() => {
    setDraftTitle(clip?.best_title ?? '')
    setEditingTitle(true)
    setTitleError(null)
  }, [clip?.best_title])

  const cancelEditTitle = useCallback(() => {
    setEditingTitle(false)
    setDraftTitle(clip?.best_title ?? '')
    setTitleError(null)
  }, [clip?.best_title])

  const saveTitle = useCallback(async () => {
    const id = clip?.id
    if (!id || titleSaving) return
    setTitleSaving(true)
    setTitleError(null)
    try {
      await updateClipBestTitle(id, draftTitle)
      onTitleUpdated(id, draftTitle.trim() ? draftTitle.trim() : null)
      setEditingTitle(false)
    } catch (e) {
      setTitleError(e instanceof Error ? e.message : 'Could not save title')
    } finally {
      setTitleSaving(false)
    }
  }, [clip?.id, draftTitle, onTitleUpdated, titleSaving])

  useEffect(() => {
    if (variant !== 'compact' || !editingTitle) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [variant, editingTitle])

  useEffect(() => {
    if (variant !== 'compact' || !editingTitle) return
    // Only focus+select — no scrollIntoView. The dialog is positioned via
    // visualViewport geometry (vvTop/vvHeight), so scrolling is never needed.
    const rafId = requestAnimationFrame(() => {
      const el = compactInputRef.current
      if (!el) return
      el.focus()
      el.select()
    })
    return () => cancelAnimationFrame(rafId)
  }, [variant, editingTitle])

  useEffect(() => {
    if (variant !== 'compact' || !editingTitle) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        cancelEditTitle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [variant, editingTitle, cancelEditTitle])

  const displayTitle = clip?.best_title?.trim() ? clip.best_title : '—'
  const showEdit = Boolean(clip?.id)

  if (variant === 'compact') {
    return (
      <>
        <div
          className={`shrink-0 border-b border-white/5 bg-surface-container/80 px-3 py-2 backdrop-blur-sm ${className}`}
        >
          {!showEdit ? (
            <span className="text-sm text-on-surface-variant">No clip selected</span>
          ) : (
            <div className="flex min-h-10 items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-on-surface">
                {displayTitle}
              </span>
              <button
                type="button"
                onClick={startEditTitle}
                disabled={editDisabled || titleSaving}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/15 text-primary transition hover:bg-primary/25 disabled:opacity-50"
                aria-label="Edit title"
                aria-haspopup="dialog"
                aria-expanded={editingTitle}
              >
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 0" }}>
                  edit
                </span>
              </button>
            </div>
          )}
        </div>

        {showEdit && editingTitle ? (
          <div
            className="fixed inset-0 z-[100]"
            role="presentation"
            style={{ overscrollBehavior: 'contain' }}
          >
            {/* Backdrop */}
            <button
              type="button"
              className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
              aria-label="Close title editor"
              onClick={() => !titleSaving && cancelEditTitle()}
            />
            {/*
              Dialog is positioned relative to the visual viewport so it stays
              fully visible above the keyboard on both Android and iOS.
              vvTop = visualViewport.offsetTop  (non-zero when iOS scrolls under keyboard)
              vvHeight = visualViewport.height  (shrinks when keyboard opens)
            */}
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="qa-compact-title-edit-heading"
              className="pointer-events-auto absolute left-1/2 z-10 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-white/10 bg-surface-container p-4 shadow-2xl"
              style={{
                top: `calc(${vvTop}px + max(1rem, env(safe-area-inset-top)))`,
                maxHeight: `calc(${vvHeight}px - max(1rem, env(safe-area-inset-top)) - 1.5rem)`,
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <form
                className="flex flex-col"
                onSubmit={(e) => {
                  e.preventDefault()
                  void saveTitle()
                }}
              >
                <div className="mb-3 flex items-center gap-2">
                  <h2
                    id="qa-compact-title-edit-heading"
                    className="min-w-0 flex-1 truncate font-headline text-base font-bold text-on-surface"
                  >
                    Edit title
                  </h2>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={cancelEditTitle}
                      disabled={titleSaving}
                      className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg px-2 text-sm font-medium text-on-surface-variant transition hover:bg-white/5 hover:text-on-surface disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={titleSaving || editDisabled}
                      className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-on-primary transition hover:opacity-95 disabled:opacity-50"
                    >
                      {titleSaving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
                <input
                  ref={compactInputRef}
                  type="text"
                  inputMode="text"
                  enterKeyHint="done"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="sentences"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  disabled={titleSaving}
                  className="h-11 w-full min-w-0 rounded-lg border border-outline-variant bg-surface-container-low px-3 text-base font-medium text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
                  placeholder="Clip title"
                />
                {titleError ? (
                  <p className="mt-3 text-xs text-error" role="alert">
                    {titleError}
                  </p>
                ) : null}
              </form>
            </div>
          </div>
        ) : null}
      </>
    )
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <span className="text-xs text-on-surface-variant/60">Title</span>
      {!showEdit ? (
        <span className="font-semibold text-on-surface">—</span>
      ) : editingTitle ? (
        <div className="space-y-2">
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="sentences"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            disabled={titleSaving}
            className="h-9 w-full min-w-0 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
            placeholder="Clip title"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void saveTitle()}
              disabled={titleSaving || editDisabled}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-[11px] font-medium text-on-primary transition hover:opacity-95 disabled:opacity-50"
            >
              {titleSaving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={cancelEditTitle}
              disabled={titleSaving}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-surface-container-low px-2 py-1 text-[11px] font-medium text-on-surface-variant transition hover:border-primary/40 hover:text-on-surface disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
          {titleError ? (
            <p className="text-xs text-error" role="alert">
              {titleError}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-9 items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-semibold text-on-surface">{displayTitle}</span>
          <button
            type="button"
            onClick={startEditTitle}
            disabled={editDisabled || titleSaving}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/15 text-primary transition hover:bg-primary/25 disabled:opacity-50"
            aria-label="Edit title"
          >
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 0" }}>
              edit
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
