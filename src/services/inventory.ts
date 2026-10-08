import { db } from '../lib/db'
import { newId, nowISO } from '../utils/ids'
import type { Product, ProductVariant } from '../types/models'

// Crea un producto con una variante inicial (talla/color/cantidad).
// La cantidad inicial puede ser 0; luego se agrega mercadería con addStock.
export async function createProduct(data: {
  name: string
  price: number
  code?: string
  category?: string
  cost?: number
  stockMin?: number
  size?: string
  color?: string
  quantity?: number
}) {
  const productId = newId()
  const variantId = newId()
  const now = nowISO()

  const product: Product = {
    id: productId,
    name: data.name.trim(),
    code: data.code?.trim() || undefined,
    category: data.category?.trim() || undefined,
    price: data.price,
    cost: data.cost,
    stockMin: data.stockMin ?? 0,
    active: true,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  }

  const variant: ProductVariant = {
    id: variantId,
    productId,
    size: data.size?.trim() || undefined,
    color: data.color?.trim() || undefined,
    quantity: data.quantity ?? 0,
    code: data.code?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  }

  await db.transaction('rw', db.products, db.productVariants, async () => {
    await db.products.add(product)
    await db.productVariants.add(variant)
  })

  return { product, variant }
}

// Entrada de mercadería: aumenta stock y deja movimiento.
export async function addStock(variantId: string, quantity: number, note?: string) {
  const now = nowISO()
  await db.transaction('rw', db.productVariants, db.products, db.inventoryMovements, async () => {
    const variant = await db.productVariants.get(variantId)
    if (!variant) throw new Error('Producto no encontrado')
    const product = await db.products.get(variant.productId)
    await db.productVariants.update(variantId, { quantity: variant.quantity + quantity, updatedAt: now, syncStatus: 'pending' })
    await db.inventoryMovements.add({
      id: newId(),
      variantId,
      productName: product?.name ?? '',
      reason: 'entrada',
      quantity,
      note,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    })
  })
}

// Ajuste manual de stock (positivo o negativo) con motivo obligatorio.
export async function adjustStock(variantId: string, newQuantity: number, note: string) {
  const now = nowISO()
  await db.transaction('rw', db.productVariants, db.products, db.inventoryMovements, async () => {
    const variant = await db.productVariants.get(variantId)
    if (!variant) throw new Error('Producto no encontrado')
    const product = await db.products.get(variant.productId)
    const diff = newQuantity - variant.quantity
    await db.productVariants.update(variantId, { quantity: newQuantity, updatedAt: now, syncStatus: 'pending' })
    await db.inventoryMovements.add({
      id: newId(),
      variantId,
      productName: product?.name ?? '',
      reason: 'ajuste',
      quantity: diff,
      note,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    })
  })
}

export async function listProductsWithStock() {
  const products = await db.products.filter((p) => p.active).toArray()
  const variants = await db.productVariants.toArray()
  return products.map((p) => {
    const vs = variants.filter((v) => v.productId === p.id)
    const quantity = vs.reduce((sum, v) => sum + v.quantity, 0)
    return { product: p, variants: vs, quantity }
  })
}
