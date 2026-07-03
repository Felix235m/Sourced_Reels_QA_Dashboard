type Props = {
  onApprove: () => void
  onReject: () => void
  disabled: boolean
}

export default function ClipsQaDecisionBar({ onApprove, onReject, disabled }: Props) {
  return (
    <div className="shrink-0 border-t border-white/10 bg-[#0d0d18]/95 px-3 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-lg items-stretch justify-center gap-2 sm:gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={onApprove}
          className="group flex min-h-[48px] min-w-0 max-w-[9rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg disabled:opacity-50"
        >
          <div className="flex h-11 w-full items-center justify-center rounded-lg bg-gradient-to-br from-secondary to-secondary-container shadow-md shadow-secondary/20 transition-all active:scale-95 sm:h-12">
            <span
              className="material-symbols-outlined text-2xl text-on-primary-fixed sm:text-[1.75rem]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              done
            </span>
          </div>
          <span className="text-center font-headline text-[9px] font-bold uppercase tracking-widest text-secondary sm:text-[10px]">
            Approve
          </span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onReject}
          className="group flex min-h-[48px] min-w-0 max-w-[9rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg disabled:opacity-50"
        >
          <div className="flex h-11 w-full items-center justify-center rounded-lg bg-gradient-to-br from-tertiary to-error-container shadow-md shadow-tertiary/20 transition-all active:scale-95 sm:h-12">
            <span
              className="material-symbols-outlined text-2xl text-on-primary-fixed sm:text-[1.75rem]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              close
            </span>
          </div>
          <span className="text-center font-headline text-[9px] font-bold uppercase tracking-widest text-tertiary sm:text-[10px]">
            Reject
          </span>
        </button>
      </div>
    </div>
  )
}
