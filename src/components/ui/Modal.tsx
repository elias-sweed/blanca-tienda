import { useEffect, useRef, type ReactNode } from 'react'
import { Portal } from './Portal'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/** Capas por encima de la barra de navegación (z-40) y el header (z-30). */
export const Z_OVERLAY = 100

/** Todo lo que se puede enfocar con teclado dentro del panel. */
const FOCO = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({ open, title, onClose, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  // El cierre más reciente vive en un ref: el listener de teclado no se
  // vuelve a suscribir en cada render del padre.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    // Quién tenía el foco antes de abrir: se devuelve al cerrar.
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null

    // El foco entra al modal: quien navega con teclado o lector de pantalla
    // empieza justo en el cuadro que se abrió.
    panel?.focus()

    function manejarTecla(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !panel) return

      // Focus trap: Tab y Shift+Tab dan vueltas dentro del modal.
      const foco = Array.from(panel.querySelectorAll<HTMLElement>(FOCO)).filter(
        (el) => el.offsetParent !== null,
      )
      if (foco.length === 0) {
        panel.focus()
        return
      }
      const primero = foco[0]
      const ultimo = foco[foco.length - 1]
      const activo = document.activeElement

      if (e.shiftKey) {
        if (activo === panel || activo === primero || !panel.contains(activo)) {
          e.preventDefault()
          ultimo.focus()
        }
      } else if (activo === ultimo || !panel.contains(activo)) {
        e.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', manejarTecla)
    return () => {
      document.removeEventListener('keydown', manejarTecla)
      // Devuelve el foco al botón que abrió el modal.
      anterior?.focus()
    }
  }, [open])

  if (!open) return null
  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-end justify-center bg-black/80 sm:items-center"
        style={{ zIndex: Z_OVERLAY }}
        onClick={onClose}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
          className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-line-strong bg-raised p-5 shadow-xl focus:outline-none sm:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
            <h2 className="text-xl font-bold text-title">{title}</h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-inset text-lg leading-none text-fg-soft transition-colors duration-150 hover:bg-ruby hover:text-fg active:bg-ruby"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
          {children}
        </div>
      </div>
    </Portal>
  )
}
