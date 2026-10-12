import { useState } from 'react'

interface Props {
  text: string
}

/**
 * Botón "?" con ayuda en palabras sencillas. El punto se anima con un latido
 * suave de solo opacidad (2.4 s) para invitar al toque sin distraer; se detiene
 * mientras la ayuda está abierta. Se apaga solo si el sistema pide menos movimiento.
 */
export function HelpTooltip({ text }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-block align-middle">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Ayuda"
        aria-expanded={open}
        className={`ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-accent-text/60 bg-accent/30 text-xs font-bold leading-none text-accent-text shadow-[0_0_6px_rgba(0,217,255,0.35)] transition-colors duration-150 hover:bg-accent/50 ${
          open ? '' : 'animate-ayuda-latido'
        }`}
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
