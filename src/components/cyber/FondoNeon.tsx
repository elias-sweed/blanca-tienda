import { memo } from 'react'

/**
 * Fondo neón del sistema.
 *
 * Coste de render: dos capas fijas detrás del contenido. Los orbes se mueven
 * solo con `transform: translate3d(...) scale(...)`, que el compositor ejecuta
 * en la GPU sin recalcular layout ni paint. `will-change` se declara en línea
 * para reservar la capa antes del primer frame y evitar el "jank" del arranque.
 *
 * El componente es `memo` y no recibe props: los re-renders de la app nunca lo
 * invalidan.
 */
export const FondoNeon = memo(function FondoNeon() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-bg"
    >
      {/* Halo violeta superior */}
      <div
        className="animate-float-a absolute -top-[18%] inset-x-0 mx-auto h-[58vmin] w-[58vmin] rounded-full"
        style={{
          willChange: 'transform',
          background:
            'radial-gradient(circle, rgba(139,0,255,0.30) 0%, rgba(139,0,255,0.08) 45%, rgba(139,0,255,0) 70%)',
        }}
      />

      {/* Halo cian inferior */}
      <div
        className="animate-float-b absolute -bottom-[22%] -right-[12%] h-[52vmin] w-[52vmin] rounded-full"
        style={{
          willChange: 'transform',
          background:
            'radial-gradient(circle, rgba(0,245,255,0.22) 0%, rgba(0,245,255,0.06) 46%, rgba(0,245,255,0) 72%)',
        }}
      />

      {/* Línea de escaneo láser: se desplaza con transform, no con top */}
      <div
        className="animate-scanline absolute inset-x-0 top-0 h-24"
        style={{
          willChange: 'transform',
          background:
            'linear-gradient(to bottom, rgba(0,245,255,0) 0%, rgba(0,245,255,0.06) 50%, rgba(0,245,255,0) 100%)',
        }}
      />

      {/* Rejilla técnica: estática, coste cero de animación */}
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(48,33,63,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(48,33,63,0.6) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      {/* Viñeta para dar profundidad sin filtrar */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 40%, rgba(5,5,10,0) 0%, rgba(5,5,10,0.55) 78%, rgba(5,5,10,0.9) 100%)',
        }}
      />
    </div>
  )
})