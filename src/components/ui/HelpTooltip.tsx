import { useState } from 'react'

interface Props {
  text: string
}

export function HelpTooltip({ text }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-line-strong text-xs font-bold text-fg-mute transition-colors duration-150 hover:border-accent-text hover:text-accent-text"
        aria-label="Ayuda"
      >
        ?
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 rounded-xl border border-line-strong bg-raised p-3 text-xs text-fg shadow-xl">
            {text}
            <div className="absolute left-1/2 top-full -translate-x-1/2 border-8 border-transparent border-t-line-strong" />
          </div>
        </>
      )}
    </span>
  )
}
