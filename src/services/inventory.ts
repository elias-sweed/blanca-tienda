import { db } from '../lib/db'
import { newId, nowISO } from '../utils/ids'
import type { Product, ProductVariant } from '../types/models'

export interface ProductVariantInput {
  size?: string
  color?: string
  quantity?: number
  code?: string
}

function validateQuantity(n: number, campo = 'la cantidad'): number {
  const value = Number(n)
  if (!Number.isFinite(value)) throw new Error(`${campo} no es válida`)
  if (value < 0) throw new Error(`${campo} no puede ser negativa`)
  return Math.floor(value)
}

function validatePrice(n: number): number {
  const value = Number(n)
  if (!Number.isFinite(value) || value <= 0) throw new Error('El precio debe ser mayor a cero')
  return value
}

function requireNonEmpty(value: string, campo: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`El ${campo} está vacío`)
  return trimmed
}

function variantFrom(input: ProductVariantInput, productId: string, now: string): ProductVariant {
  return {
    id: newId(),
    productId,
    size: input.size?.trim() || undefined,
    color: input.color?.trim() || undefined,
    quantity: validateQuantity(input.quantity ?? 0),
    code: input.code?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  }
}

function movement(
  variantId: string,
  productName: string,
  reason: 'entrada' | 'ajuste',
  quantity: number,
  now: string,
  note?: string,
) {
  return {
    id: newId(),
    variantId,
    productName,
    reason,
    quantity,
    note,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending' as const,
  }
}

/**
 * Crea un producto con una o más variantes (talla/color/cantidad).
 * Las variantes se escriben en la misma transacción que el producto.
 */
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
  variants?: ProductVariantInput[]
}) {
  const now = nowISO()
  const name = requireNonEmpty(data.name, 'nombre')
  const price = validatePrice(data.price)
  const stockMin = validateQuantity(data.stockMin ?? 0, 'el stock mínimo')

  const product: Product = {
    id: newId(),
    name,
    code: data.code?.trim() || undefined,
    category: data.category?.trim() || undefined,
    price,
    cost: data.cost,
    stockMin,
    active: true,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  }

  // Si no vienen variantes, se crea una con la talla/color sueltos del formulario.
  const raw = data.variants && data.variants.length > 0
    ? data.variants
    : [{ size: data.size, color: data.color, quantity: data.quantity, code: data.code }]

  const variants = raw.map((v) => variantFrom(v, product.id, now))

  await db.transaction('rw', db.products, db.productVariants, db.inventoryMovements, async () => {
    await db.products.add(product)
    await db.productVariants.bulkAdd(variants)

    const entradas = variants
      .filter((v) => v.quantity > 0)
      .map((v) => movement(v.id, product.name, 'entrada', v.quantity, now, 'Stock inicial'))
    if (entradas.length > 0) await db.inventoryMovements.bulkAdd(entradas)
  })

  return { product, variants }
}

/** Actualiza los datos del producto. No toca las variantes ni el stock. */
export async function updateProduct(productId: string, data: {
  name: string
  price: number
  category?: string
  code?: string
  cost?: number
  stockMin?: number
}) {
  const now = nowISO()
  await db.transaction('rw', db.products, async () => {
    const product = await db.products.get(productId)
    if (!product) throw new Error('Producto no encontrado')
    await db.products.update(productId, {
      name: requireNonEmpty(data.name, 'nombre'),
      price: validatePrice(data.price),
      category: data.category?.trim() || undefined,
      code: data.code?.trim() || undefined,
      cost: data.cost,
      stockMin: validateQuantity(data.stockMin ?? 0, 'el stock mínimo'),
      updatedAt: now,
      syncStatus: 'pending',
    })
  })
}

/**
 * Agrega una variante (talla/color) a un producto existente.
 * Si la combinación talla/color ya existe, en lugar de duplicar devuelve error.
 */
export async function addVariant(productId: string, input: ProductVariantInput) {
  const now = nowISO()
  return db.transaction('rw', db.products, db.productVariants, db.inventoryMovements, async () => {
    const product = await db.products.get(productId)
    if (!product) throw new Error('Producto no encontrado')

    const size = input.size?.trim() || undefined
    const color = input.color?.trim() || undefined
    const existing = await db.productVariants.where('productId').equals(productId).toArray()
    const duplicate = existing.find((v) => (v.size ?? '') === (size ?? '') && (v.color ?? '') === (color ?? ''))
    if (duplicate) throw new Error('Ya existe una variante con esa talla y color')

    const variant = variantFrom(input, productId, now)
    await db.productVariants.add(variant)
    if (variant.quantity > 0) {
      await db.inventoryMovements.add(movement(variant.id, product.name, 'entrada', variant.quantity, now, 'Stock inicial'))
    }
    return variant
  })
}

/**
 * Baja un producto del catálogo (soft delete) o lo reactiva.
 * El stock y el histórico se conservan; queda marcado `deleted`.
 */
export async function setProductActive(productId: string, active: boolean) {
  const now = nowISO()
  await db.transaction('rw', db.products, async () => {
    const product = await db.products.get(productId)
    if (!product) throw new Error('Producto no encontrado')
    await db.products.update(productId, {
      active,
      deleted: !active ? true : undefined,
      updatedAt: now,
      syncStatus: 'pending',
    })
  })
}

/**
 * Entrada de mercadería: aumenta stock y deja movimiento.
 * No permite dejar la cantidad en negativo.
 */
export async function addStock(variantId: string, quantity: number, note?: string) {
  const delta = validateQuantity(quantity, 'la cantidad que ingresa')
  if (delta === 0) throw new Error('La cantidad que ingresa debe ser mayor a cero')

  const now = nowISO()
  await db.transaction('rw', db.productVariants, db.products, db.inventoryMovements, async () => {
    const variant = await db.productVariants.get(variantId)
    if (!variant) throw new Error('Producto no encontrado')
    const product = await db.products.get(variant.productId)
    const next = variant.quantity + delta
    if (next < 0) throw new Error('La cantidad no puede quedar negativa')

    await db.productVariants.update(variantId, {
      quantity: next,
      updatedAt: now,
      syncStatus: 'pending',
    })
    await db.inventoryMovements.add(movement(variantId, product?.name ?? '', 'entrada', delta, now, note))
  })
}

/**
 * Ajuste manual de stock a una cantidad absoluta, con motivo obligatorio.
 * Es la vía para corregir errores de conteo: fija el valor real, no un delta.
 */
export async function adjustStock(variantId: string, newQuantity: number, note: string) {
  const target = validateQuantity(newQuantity, 'la cantidad final')
  const motivo = requireNonEmpty(note, 'motivo')

  const now = nowISO()
  return db.transaction('rw', db.productVariants, db.products, db.inventoryMovements, async () => {
    const variant = await db.productVariants.get(variantId)
    if (!variant) throw new Error('Producto no encontrado')
    const product = await db.products.get(variant.productId)

    const diff = target - variant.quantity
    if (diff === 0) throw new Error('La cantidad ya es esa, no hay nada que ajustar')

    await db.productVariants.update(variantId, {
      quantity: target,
      updatedAt: now,
      syncStatus: 'pending',
    })
    await db.inventoryMovements.add(movement(variantId, product?.name ?? '', 'ajuste', diff, now, motivo))
    return diff
  })
}

/** Productos activos con su stock agregado. Excluye los dados de baja. */
export async function listProductsWithStock() {
  const products = await db.products.filter((p) => p.active && !p.deleted).toArray()
  const variants = await db.productVariants.toArray()
  return products.map((p) => {
    const vs = variants.filter((v) => v.productId === p.id)
    return { product: p, variants: vs, quantity: vs.reduce((sum, v) => sum + v.quantity, 0) }
  })
}

/** Variantes de un producto. */
export async function getVariants(productId: string): Promise<ProductVariant[]> {
  return db.productVariants.where('productId').equals(productId).toArray()
}
