import { useLayoutEffect, useRef, useState } from 'react'

interface Props {
  text: string
}

/**
 * Botón "?" con ayuda en palabras sencillas. El punto se anima con un latido
 * suave de solo opacidad (2.4 s) para invitar al toque sin distraer; se detiene
 * mientras la ayuda está abierta. Se apaga solo si el sistema pide menos movimiento.
 *
 * El globo se posiciona contra la pantalla (no contra el botón): se centra y se
 * acota a los márgenes, así nunca se sale del costado izquierdo ni del derecho.
 */
export function HelpTooltip({ text }: Props) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; arrowX: number; below: boolean } | null>(null)

  // Mide y coloca el globo antes de pintar: centrado sobre el botón, y si no
  // entra en pantalla se acota al margen (8 px) del lado que se desborde.
  // La medición va en un rAF para no encadenar renders desde el efecto.
  useLayoutEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => {
      const btn = btnRef.current
      const pop = popRef.current
      if (!btn || !pop) return
      const r = btn.getBoundingClientRect()
      const pw = pop.offsetWidth
      const ph = pop.offsetHeight
      const margin = 8
      const btnCenter = r.left + r.width / 2

      let left = btnCenter - pw / 2
      left = Math.min(Math.max(margin, left), window.innerWidth - pw - margin)

      const above = r.top - ph - 10 >= margin
      const top = above ? r.top - ph - 10 : r.bottom + 10
      const arrowX = Math.min(Math.max(16, btnCenter - left), pw - 16)

      setPos({ top, left, arrowX, below: !above })
    })
    return () => cancelAnimationFrame(frame)
  }, [open])

  return (
    <span className="relative inline-block align-middle">
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          // Al cerrar se borra la posición para que el próximo toque vuelva
          // a medir contra la pantalla.
          if (open) setPos(null)
          setOpen(!open)
        }}
        aria-label="Ayuda"
        aria-expanded={open}
        className={`ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-line-active/60 bg-surface text-xs font-bold leading-none text-cta-text transition-colors duration-150 hover:border-line-active ${
          open ? '' : 'animate-ayuda-latido'
        }`}
      >
        ?
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            ref={popRef}
            style={
              pos
                ? { top: pos.top, left: pos.left }
                : { top: -9999, left: -9999 }
            }
            className="fixed z-50 w-48 rounded-xl border border-line-strong bg-raised p-3 text-xs text-fg shadow-lg"
          >
            {text}
            {pos && (
              pos.below ? (
                <div
                  style={{ left: pos.arrowX }}
                  className="absolute bottom-full -translate-x-1/2 border-8 border-transparent border-b-line-strong"
                />
              ) : (
                <div
                  style={{ left: pos.arrowX }}
                  className="absolute top-full -translate-x-1/2 border-8 border-transparent border-t-line-strong"
                />
              )
            )}
          </div>
        </>
      )}
    </span>
  )
}
