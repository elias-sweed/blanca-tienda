import { useEffect, useRef } from 'react'
import { Portal } from './Portal'
import { Z_OVERLAY } from './Modal'

interface Props {
  /** Frase corta, en positivo: "¡Venta registrada!". */
  message: string
  /** Segundos que queda visible. Sale sola, sin botón. */
  seconds?: number
  onDone: () => void
}

/**
 * Estado de éxito: confirmación visual inmediata con un check grande.
 *
 * Es una capa de `opacity`/`transform` sobre el contenido, sin filtros ni
 * sombras animadas, para que no cueste fotogramas en gama baja.
 * `useEffect` limpia el temporizador al desmontar: no quedan timers huérfanos.
 */
export function SuccessState({ message, seconds = 1.6, onDone }: Props) {
  // El callback vive en un ref: si el padre se vuelve a renderizar durante el
  // aviso, el temporizador no se reinicia y el mensaje sí desaparece a tiempo.
  const doneRef = useRef(onDone)

  useEffect(() => {
    doneRef.current = onDone
  })

  useEffect(() => {
    const timer = window.setTimeout(() => doneRef.current(), seconds * 1000)
    return () => window.clearTimeout(timer)
  }, [seconds])

  return (
    <Portal>
      <div
        className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-bg/95"
        style={{ zIndex: Z_OVERLAY + 10, animation: 'pulse-soft 600ms ease-out 1' }}
        role="status"
        aria-live="assertive"
      >
        <span
          className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-success bg-success/15 text-6xl font-bold text-success"
          style={{ willChange: 'transform, opacity' }}
        >
          ✓
        </span>
        <p className="px-6 text-center text-2xl font-bold text-title">{message}</p>
      </div>
    </Portal>
  )
}
