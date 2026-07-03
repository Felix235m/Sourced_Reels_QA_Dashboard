export default function ClipsQaFooterShortcuts() {
  const item = (kbd: string, label: string, kbdClass: string) => (
    <div className="flex items-center gap-2">
      <kbd
        className={`rounded border border-white/10 bg-surface-bright px-2 py-0.5 font-label text-[10px] ${kbdClass}`}
      >
        {kbd}
      </kbd>
      <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
        {label}
      </span>
    </div>
  )

  return (
    <footer className="fixed bottom-0 z-50 hidden h-12 w-full items-center justify-center gap-8 border-t border-white/10 bg-[#0d0d18]/90 px-12 shadow-2xl backdrop-blur-md lg:flex md:gap-12">
      <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
        {item('A', 'Approve', 'text-secondary border-secondary/20')}
        {item('R', 'Reject', 'text-tertiary border-tertiary/20')}
        {item('Space', 'Pause/Resume', 'text-[#bd9dff] border-[#bd9dff]/20')}
      </div>
    </footer>
  )
}
