import { useEffect, useRef, useState } from 'react'

type Props = {
  selectedGame: string | null
  availableGames: string[]
  onGameChange: (game: string | null) => void
}

export default function GameFilterDropdown({ selectedGame, availableGames, onGameChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  const label = selectedGame ?? 'Games'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-surface-bright px-2.5 py-1.5 text-sm font-bold text-on-surface transition hover:border-primary/30 hover:bg-white/10"
      >
        <span
          className="material-symbols-outlined text-primary"
          style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
        >
          sports_esports
        </span>
        <span className="max-w-[110px] truncate">{label}</span>
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1.5 min-w-[180px] overflow-hidden rounded-lg border border-white/10 bg-surface-container-high py-1 shadow-2xl shadow-black/60">
          {availableGames.map((item) => {
            const active = selectedGame === item
            return (
              <button
                key={item}
                type="button"
                onClick={() => {
                  onGameChange(item)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/8 ${
                  active ? 'text-primary' : 'text-on-surface-variant'
                }`}
              >
                <span
                  className="material-symbols-outlined shrink-0"
                  style={{ fontSize: '14px', opacity: active ? 1 : 0 }}
                >
                  check
                </span>
                <span className={active ? 'font-bold' : ''}>{item}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}