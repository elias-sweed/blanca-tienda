import { db } from '../lib/db'
import { newId, nowISO, todayISO } from '../utils/ids'
import type { Sale } from '../types/models'
import { getOpenRegister } from './cash'

export async function registerSale(data: {
  variantId: string
  quantity: number
  paymentMethod: Sale['paymentMethod']
}) {
  const now = nowISO()
  const openRegister = await getOpenRegister()
  if (!openRegister) throw new Error('No hay una caja abierta. Abre caja primero.')

  await db.transaction('rw', db.sales, db.saleItems, db.productVariants, db.products, db.inventoryMovements, async () => {
    const variant = await db.productVariants.get(data.variantId)
    if (!variant) throw new Error('Producto no encontrado')
    if (variant.quantity < data.quantity) throw new Error('No hay suficiente stock')
    const product = await db.products.get(variant.productId)
    if (!product) throw new Error('Producto no encontrado')

    const unitPrice = product.price
    const subtotal = unitPrice * data.quantity
    const saleId = newId()

    await db.sales.add({
      id: saleId,
      total: subtotal,
      paymentMethod: data.paymentMethod,
      date: todayISO(),
      registerId: openRegister.id,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    })

    await db.saleItems.add({
      id: newId(),
      saleId,
      variantId: data.variantId,
      productName: product.name,
      quantity: data.quantity,
      unitPrice,
      subtotal,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    })

    await db.productVariants.update(data.variantId, {
      quantity: variant.quantity - data.quantity,
      updatedAt: now,
      syncStatus: 'pending',
    })

    await db.inventoryMovements.add({
      id: newId(),
      variantId: data.variantId,
      productName: product.name,
      reason: 'venta',
      quantity: -data.quantity,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    })
  })
}
