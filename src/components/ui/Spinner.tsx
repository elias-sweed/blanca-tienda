import { SkeletonFilas } from '../cyber/Skeleton'

/**
 * Estados de carga sin spinner's rotatorio: usa skeletons estáticos que solo
 * animan opacidad, lo que no fuerza repintado continuo en CPUs lentas.
 */
export function Spinner({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label={label}>
      <SkeletonFilas filas={3} />
      <p className="sr-only">{label}</p>
    </div>
  )
}