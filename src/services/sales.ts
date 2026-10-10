import { db } from '../lib/db'
import { newId, nowISO, todayISO } from '../utils/ids'
import { round2 } from '../utils/money'
import type { Sale, SaleItem, Product, ProductVariant } from '../types/models'
import { getOpenRegister } from './cash'

export interface SaleItemInput {
  variantId?: string
  quantity: number
}

// Producto que aún no existe: se crea y se vende dentro de la misma transacción,
// de modo que nunca queda un producto huérfano en el catálogo si la venta falla.
export interface NewProductForSale {
  name: string
  price: number
  size?: string
  color?: string
  category?: string
  code?: string
  cost?: number
  stockMin?: number
}

export type SaleLineInput = ({ variantId: string } & SaleItemInput) | ({ newProduct: NewProductForSale } & SaleItemInput)

interface ResolvedLine {
  product: Product
  variant: ProductVariant
  quantity: number
  isNew: boolean
}

export interface RegisterSaleResult {
  sale: Sale
  items: SaleItem[]
}

/**
 * Registra una venta completa: 1 registro en `sales`, N registros en `saleItems`,
 * N movimientos de inventario y el descuento de stock, todo en una sola transacción
 * de Dexie. Si algo falla, no queda nada escrito.
 *
 * El total, el monto pagado y el vuelto se calculan una única vez para la venta.
 */
export async function registerSale(data: {
  lines: SaleLineInput[]
  paymentMethod: Sale['paymentMethod']
  amountPaid?: number
  /**
   * Clave única generada antes del primer envío. Hace que la operación sea
   * idempotente: si el mismo intento llega dos veces, la segunda devuelve la
   * venta ya registrada en lugar de cobrar y descontar stock otra vez.
   */
  clientRequestId?: string
}): Promise<RegisterSaleResult> {
  if (data.lines.length === 0) throw new Error('La venta no tiene productos')

  const openRegister = await getOpenRegister()
  if (!openRegister) throw new Error('No hay una caja abierta. Abre caja primero.')

  const amountPaid = data.amountPaid === undefined ? undefined : round2(data.amountPaid)
  if (amountPaid !== undefined && (!Number.isFinite(amountPaid) || amountPaid < 0)) {
    throw new Error('El monto pagado no es válido')
  }

  return db.transaction(
    'rw',
    db.sales,
    db.saleItems,
    db.products,
    db.productVariants,
    db.inventoryMovements,
    async () => {
      // Guard clause de idempotencia. Se comprueba dentro de la transacción
      // para que la lectura y la escritura sean atómicas: dos toques
      // simultáneos no pueden pasar ambas comprobaciones y duplicar la venta.
      if (data.clientRequestId) {
        const repetida = await db.sales
          .where('clientRequestId')
          .equals(data.clientRequestId)
          .first()
        if (repetida) {
          const itemsRepetida = await db.saleItems.where('saleId').equals(repetida.id).toArray()
          return { sale: repetida, items: itemsRepetida }
        }
      }

      const resolved = await resolveLines(data.lines)

      const total = round2(resolved.reduce((sum, l) => sum + l.product.price * l.quantity, 0))
      if (total <= 0) throw new Error('El total de la venta debe ser mayor a cero')
      if (amountPaid !== undefined && amountPaid < total) {
        throw new Error(`El monto pagado (S/ ${amountPaid.toFixed(2)}) es menor al total (S/ ${total.toFixed(2)})`)
      }

      const now = nowISO()
      const saleId = newId()

      // Productos nuevos: se escriben aquí, dentro de la misma transacción.
      for (const line of resolved) {
        if (!line.isNew) continue
        await db.products.add(line.product)
        await db.productVariants.add(line.variant)
        await db.inventoryMovements.add({
          id: newId(),
          variantId: line.variant.id,
          productName: line.product.name,
          reason: 'entrada',
          quantity: line.quantity,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending',
        })
      }

      await db.sales.add({
        id: saleId,
        total,
        paymentMethod: data.paymentMethod,
        date: todayISO(),
        registerId: openRegister.id,
        amountPaid,
        change: amountPaid === undefined ? undefined : round2(amountPaid - total),
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending',
      })

      const saleItems: SaleItem[] = resolved.map((line) => {
        const subtotal = round2(line.product.price * line.quantity)
        return {
          id: newId(),
          saleId,
          variantId: line.variant.id,
          productName: line.product.name,
          quantity: line.quantity,
          unitPrice: line.product.price,
          subtotal,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending',
        }
      })
      await db.saleItems.bulkAdd(saleItems)

      // Descuento de stock + movimiento de salida, una vez por variante.
      for (const line of resolved) {
        const current = await db.productVariants.get(line.variant.id)
        if (!current) throw new Error('Producto no encontrado')
        await db.productVariants.update(line.variant.id, {
          quantity: current.quantity - line.quantity,
          updatedAt: now,
          syncStatus: 'pending',
        })
        await db.inventoryMovements.add({
          id: newId(),
          variantId: line.variant.id,
          productName: line.product.name,
          reason: 'venta',
          quantity: -line.quantity,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending',
        })
      }

      const sale = await db.sales.get(saleId)
      if (!sale) throw new Error('No se pudo registrar la venta')
      return { sale, items: saleItems }
    },
  )
}

/**
 * Anula una venta y devuelve el stock de cada línea.
 * La venta no se borra: queda marcada `anulada` para conservar el histórico.
 * Venta, detalles, reposición de stock y movimientos, todo en una transacción.
 */
export async function voidSale(saleId: string, motivo?: string): Promise<Sale> {
  return db.transaction(
    'rw',
    db.sales,
    db.saleItems,
    db.productVariants,
    db.inventoryMovements,
    async () => {
      const sale = await db.sales.get(saleId)
      if (!sale) throw new Error('La venta no existe')
      if (sale.anulada) throw new Error('La venta ya está anulada')

      const items = await db.saleItems.where('saleId').equals(saleId).toArray()
      if (items.length === 0) throw new Error('La venta no tiene detalles')

      const now = nowISO()

      for (const item of items) {
        const variant = await db.productVariants.get(item.variantId)
        if (!variant) throw new Error('Producto no encontrado')
        await db.productVariants.update(item.variantId, {
          quantity: variant.quantity + item.quantity,
          updatedAt: now,
          syncStatus: 'pending',
        })
        await db.inventoryMovements.add({
          id: newId(),
          variantId: item.variantId,
          productName: item.productName,
          reason: 'anulacion',
          quantity: item.quantity,
          note: motivo?.trim() || undefined,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending',
        })
      }

      await db.sales.update(saleId, {
        anulada: true,
        anuladaAt: now,
        anuladaMotivo: motivo?.trim() || undefined,
        updatedAt: now,
        syncStatus: 'pending',
      })

      const updated = await db.sales.get(saleId)
      if (!updated) throw new Error('No se pudo anular la venta')
      return updated
    },
  )
}

/**
 * Valida y normaliza todas las líneas antes de escribir nada.
 * Fusiona variantes repetidas para no descontar dos veces el mismo stock.
 */
async function resolveLines(lines: SaleLineInput[]): Promise<ResolvedLine[]> {
  const now = nowISO()
  const quantities = new Map<string, number>()
  const newProducts: { data: NewProductForSale; quantity: number }[] = []

  for (const line of lines) {
    const quantity = Number(line.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Cantidad inválida')
    if ('variantId' in line && line.variantId) {
      quantities.set(line.variantId, (quantities.get(line.variantId) ?? 0) + quantity)
    } else if ('newProduct' in line && line.newProduct) {
      const p = line.newProduct
      if (!p.name.trim()) throw new Error('El nombre del producto está vacío')
      if (!Number.isFinite(p.price) || p.price <= 0) throw new Error(`"${p.name.trim()}" no tiene un precio válido`)
      newProducts.push({ data: p, quantity })
    } else {
      throw new Error('Línea de venta inválida')
    }
  }

  const resolved: ResolvedLine[] = []

  for (const [variantId, quantity] of quantities) {
    const variant = await db.productVariants.get(variantId)
    if (!variant) throw new Error('Producto no encontrado')
    const product = await db.products.get(variant.productId)
    if (!product) throw new Error('Producto no encontrado')
    if (!product.active || product.deleted) throw new Error(`"${product.name}" ya no está disponible`)
    if (variant.quantity < quantity) {
      throw new Error(`No hay suficiente stock de "${product.name}" (disponibles: ${variant.quantity})`)
    }
    resolved.push({ product, variant, quantity, isNew: false })
  }

  for (const { data: p, quantity } of newProducts) {
    const productId = newId()
    const variantId = newId()
    const product: Product = {
      id: productId,
      name: p.name.trim(),
      code: p.code?.trim() || undefined,
      category: p.category?.trim() || undefined,
      price: round2(p.price),
      cost: p.cost,
      stockMin: p.stockMin ?? 0,
      active: true,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    }
    const variant: ProductVariant = {
      id: variantId,
      productId,
      size: p.size?.trim() || undefined,
      color: p.color?.trim() || undefined,
      quantity,
      code: p.code?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    }
    resolved.push({ product, variant, quantity, isNew: true })
  }

  return resolved
}
