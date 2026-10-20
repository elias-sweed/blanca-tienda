import { useEffect, useRef, useState } from 'react'
import { usePwaApp } from '../context/pwaContext'
import { Button } from './ui/Button'
import { useToast } from './ui/ToastContext'

/**
 * Avisos de la PWA: instalar la app y aplicar una versión nueva.
 *
 * No muestran ningún dato de la tienda, así que pueden verse sin problema.
 */
export function AvisosPWA() {
  const {
    instalable,
    instalar,
    actualizacionDisponible,
    aplicarActualizacion,
    listoOffline,
  } = usePwaApp()
  const { show } = useToast()
  const [instalarCerrado, setInstalarCerrado] = useState(false)
  const [actualizarCerrado, setActualizarCerrado] = useState(false)
  const avisadoOffline = useRef(false)

  useEffect(() => {
    if (!listoOffline || avisadoOffline.current) return
    avisadoOffline.current = true
    show('La app ya funciona sin internet', 'info')
  }, [listoOffline, show])

  const mostrarInstalar = instalable && !instalarCerrado
  const mostrarActualizar = actualizacionDisponible && !actualizarCerrado
  if (!mostrarInstalar && !mostrarActualizar) return null

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-4"
    >
      {mostrarActualizar && (
        <div className="pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-2xl border border-line-strong bg-raised px-4 py-3 shadow-xl">
          <p className="min-w-0 flex-1 text-sm font-semibold text-fg">
            Hay una versión nueva de la app.
          </p>
          <Button size="md" onClick={() => void aplicarActualizacion()}>
            Actualizar
          </Button>
          <button
            type="button"
            onClick={() => setActualizarCerrado(true)}
            aria-label="Cerrar aviso de actualización"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-inset text-lg leading-none text-fg-soft active:scale-90"
          >
            ×
          </button>
        </div>
      )}

      {mostrarInstalar && (
        <div className="pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-2xl border border-line-strong bg-raised px-4 py-3 shadow-xl">
          <p className="min-w-0 flex-1 text-sm font-semibold text-fg">
            Instala Blanca Tienda en tu teléfono.
          </p>
          <Button variant="secondary" size="md" onClick={() => void instalar()}>
            Instalar
          </Button>
          <button
            type="button"
            onClick={() => setInstalarCerrado(true)}
            aria-label="Cerrar aviso de instalación"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-inset text-lg leading-none text-fg-soft active:scale-90"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
