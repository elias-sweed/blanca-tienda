import { db } from '../lib/db'
import { useQueryState, type QueryState } from './useQueryState'

export interface LowStockItem {
  id: string
  name: string
  /** Detalle corto: talla/color o categoría, para reconocerlo de un vistazo. */
  detalle: string
  quantity: number
  stockMin: number
}

export type LowStockState = QueryState<LowStockItem[]>

/**
 * Productos por debajo del stock mínimo: notificación contextual de stock crítico.
 *
 * Se calcula en un solo sitio para que Inicio y Ventas digan exactamente lo mismo.
 * Mientras carga devuelve `loading` (esqueleto) y si falla, `error` con reintento.
 */
export function useLowStock(): LowStockState {
  const [state] = useQueryState<LowStockItem[]>(async () => {
    const products = await db.products.filter((p) => p.active && !p.deleted).toArray()
    const variants = await db.productVariants.toArray()

    return products
      .map((product) => {
        const own = variants.filter((v) => v.productId === product.id)
        const quantity = own.reduce((sum, v) => sum + v.quantity, 0)
        const detalle =
          own
            .map((v) => [v.size && `Talla ${v.size}`, v.color].filter(Boolean).join(' · '))
            .filter(Boolean)
            .join(' / ') || product.category || 'Única'
        return { id: product.id, name: product.name, detalle, quantity, stockMin: product.stockMin }
      })
      .filter((item) => item.quantity <= item.stockMin)
      .sort((a, b) => a.quantity - b.quantity)
  }, [])

  return state
}
