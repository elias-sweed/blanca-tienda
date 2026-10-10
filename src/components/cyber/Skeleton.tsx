import { memo, type CSSProperties } from 'react'

/**
 * Skeleton loader. Sustituye a los spinners rotatorios.
 *
 * Un `animate-spin` obliga al navegador a repintar el arco en cada frame durante
 * toda la espera. Aquí solo se anima `opacity`, que el compositor resuelve sin
 * repintar, así que el coste en CPU es casi nulo aunque la carga dure.
 */
export const Skeleton = memo(function Skeleton({
  className = '',
  style,
}: {
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      aria-hidden="true"
      className={['animate-pulse-soft rounded-xl bg-raised', className].join(' ')}
      style={style}
    />
  )
})

/** Bloques típicos para una lista de productos mientras consulta la base. */
export const SkeletonFilas = memo(function SkeletonFilas({
  filas = 3,
}: {
  filas?: number
}) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-line bg-surface p-4"
        >
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-2 h-3 w-1/2" />
          <Skeleton className="mt-3 h-3 w-2/3" />
        </div>
      ))}
    </div>
  )
})