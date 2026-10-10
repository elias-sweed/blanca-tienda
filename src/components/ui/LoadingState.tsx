import { Skeleton } from '../cyber/Skeleton'

/**
 * Estado de carga: bloques estáticos que solo pulsan la opacidad.
 *
 * Se usa en lugar de un spinner giratorio (que gasta CPU durante toda la
 * espera) y avisa a la persona de que la app está trabajando, no congelada.
 */
export function LoadingState({ rows = 3, label = 'Cargando...' }: { rows?: number; label?: string }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="rounded-2xl border border-line bg-surface p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-2 h-3 w-1/2" />
          <Skeleton className="mt-3 h-3 w-2/3" />
        </div>
      ))}
    </div>
  )
}
