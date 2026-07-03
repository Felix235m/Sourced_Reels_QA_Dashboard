import type { QaClip } from '@/types/qaClip'
import QaClipTitleEditor from '@components/qa/QaClipTitleEditor'

type Props = {
  clip: QaClip | null
  durationSec: number | null
  editDisabled: boolean
  onTitleUpdated: (clipId: string, bestTitle: string | null) => void
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

export default function QaDetailsPanel({
  clip,
  durationSec,
  editDisabled,
  onTitleUpdated,
}: Props) {
  return (
    <aside className="hidden w-72 shrink-0 flex-col border-l border-white/5 bg-surface-container lg:flex lg:w-80">
      <div className="min-h-0 flex-1 space-y-8 overflow-y-auto p-6">
        <section>
          <h3 className="mb-4 font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
            Clip info
          </h3>
          <div className="space-y-4">
            <QaClipTitleEditor
              clip={clip}
              editDisabled={editDisabled}
              onTitleUpdated={onTitleUpdated}
              variant="panel"
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-on-surface-variant/60">Duration</span>
                <span className="font-semibold text-on-surface">
                  {durationSec != null && Number.isFinite(durationSec)
                    ? `${Math.round(durationSec)}s`
                    : '—'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-on-surface-variant/60">Status</span>
                <span className="font-semibold text-secondary">Pending QA</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-on-surface-variant/60">Created</span>
              <span className="font-semibold text-on-surface">{formatTime(clip?.created_at ?? null)}</span>
            </div>
            {clip?.game ? (
              <div className="flex flex-col">
                <span className="text-xs text-on-surface-variant/60">Game</span>
                <span className="font-semibold text-on-surface">{clip.game}</span>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </aside>
  )
}