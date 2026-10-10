import { Link } from 'react-router-dom'
import type { LowStockItem } from '../../hooks/useLowStock'

interface Props {
  items: LowStockItem[]
  /** Cuántos se muestran antes de resumir el resto. */
  max?: number
}

/**
 * Aviso de stock crítico, contextual: aparece solo cuando de verdad hay algo
 * que reponer. Cláusula de guarda: sin faltantes no renderiza nada, así que
 * coste cero en la mayoría de las sesiones.
 */
export function LowStockAlert({ items, max = 3 }: Props) {
  if (items.length === 0) return null

  const visibles = items.slice(0, max)
  const resto = items.length - visibles.length

  return (
    <div
      role="status"
      className="mb-4 rounded-2xl border border-warning/50 bg-warning/10 p-4"
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning text-sm font-bold text-black"
          aria-hidden="true"
        >
          !
        </span>
        <p className="font-bold text-warning">
          {items.length === 1 ? '1 producto se está acabando' : `${items.length} productos se están acabando`}
        </p>
      </div>

      <ul className="mt-2 flex flex-col gap-1">
        {visibles.map((item) => (
          <li key={item.id} className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate text-fg-soft">
              {item.name}
              <span className="text-fg-mute"> · {item.detalle}</span>
            </span>
            <span className="shrink-0 font-bold text-danger">
              {item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'}
            </span>
          </li>
        ))}
        {resto > 0 && <li className="text-xs text-fg-mute">y {resto} más…</li>}
      </ul>

      <Link
        to="/inventario"
        className="mt-3 inline-block rounded-xl border border-warning/50 px-4 py-2 text-sm font-bold text-warning transition-colors duration-150 hover:bg-warning/15"
      >
        Reponer en Inventario →
      </Link>
    </div>
  )
}
