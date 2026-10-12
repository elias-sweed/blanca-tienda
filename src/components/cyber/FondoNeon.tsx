import { memo } from 'react'

/**
 * Fondo del sistema: grafito mate con una leve profundidad superior.
 *
 * Se eliminaron los halos neón animados, la línea de escaneo y la rejilla:
 * eran decoración permanente con coste de composición en teléfonos antiguos.
 * Queda una sola capa estática que respeta el tema (claro/oscuro).
 *
 * El componente es `memo` y no recibe props: los re-renders de la app nunca
 * lo invalidan.
 */
export const FondoNeon = memo(function FondoNeon() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-bg"
    >
      {/* Profundidad superior sutil y estática, sin animación ni desenfoque. */}
      <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-chrome to-transparent" />
    </div>
  )
})
